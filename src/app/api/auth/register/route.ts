import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createUser } from "@/lib/user-service";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/security";
import { writeAccessLog } from "@/lib/auth-session-service";
import { writeAuditLog } from "@/lib/audit-service";

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

    const user = await createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: "operador",
      active: true,
    });

    await writeAuditLog({
      userId: user.id,
      action: "register",
      module: "auth",
      detail: "Cuenta creada",
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

    return NextResponse.json({ user }, { status: 201 });
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
