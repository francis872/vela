import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createUser } from "@/lib/user-service";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/security";
import { writeAccessLog } from "@/lib/auth-session-service";
import { writeAuditLog } from "@/lib/audit-service";
import { assessRegistrationRisk } from "@/lib/risk-engine";
import { issueVerificationToken } from "@/lib/email-verification-service";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  let rlKey = "register:unknown";

  try {
    const { ip, userAgent } = getRequestMeta(request);
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    rlKey = `register:${ip}:${normalizedEmail}`;
    const rate = checkRateLimit(rlKey, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta en ${rate.retryAfterSeconds}s.` },
        { status: 429 },
      );
    }

    const risk = await assessRegistrationRisk({ email: normalizedEmail, ip });

    const user = await createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: "operador",
      active: true,
      // Trust Layer: identity is not trusted until the email is verified.
      status: "pending_verification",
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: "registration_started",
        detail: `risk=${risk.riskLevel}; signals=${risk.signals.join(",") || "none"}`,
        ip,
        userAgent,
      },
    });

    const origin = new URL(request.url).origin;
    const { verificationUrl, delivered } = await issueVerificationToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      origin,
      ip,
      userAgent,
    });

    await writeAuditLog({
      userId: user.id,
      action: "register",
      module: "auth",
      detail: "Cuenta creada (pendiente de verificación)",
      ip,
      userAgent,
    });

    await writeAccessLog({
      userId: user.id,
      email: user.email,
      success: true,
      reason: "register_success",
      ip,
      userAgent,
    });

    return NextResponse.json(
      {
        user,
        requiresVerification: true,
        riskLevel: risk.riskLevel,
        emailDelivered: delivered,
        // No email provider configured yet: expose the link outside production
        // so the flow stays testable. In production it only travels by email.
        ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      consumeRateLimit(rlKey, {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockMs: 15 * 60 * 1000,
      });
      return NextResponse.json(
        { error: "Esta cuenta ya existe. Inicia sesión con tu email." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          "No se pudo crear la cuenta. Verifica disponibilidad de base de datos o email único.",
      },
      { status: 500 },
    );
  }
}
