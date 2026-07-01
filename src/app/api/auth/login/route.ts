import { NextResponse } from "next/server";
import { z } from "zod";
import { PROFILE_READY_COOKIE, SESSION_COOKIE, signSession } from "@/lib/auth";
import { authenticateUser } from "@/lib/user-service";
import { checkRateLimit, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createAuthSession, writeAccessLog } from "@/lib/auth-session-service";
import { writeAuditLog } from "@/lib/audit-service";
import { getRequestMeta, sha256 } from "@/lib/security";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const { ip, userAgent } = getRequestMeta(request);
    const payload = await request.json();
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const rlKey = `login:${ip}:${normalizedEmail}`;
    const rate = checkRateLimit(rlKey, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    if (!rate.allowed) {
      await writeAccessLog({
        email: normalizedEmail,
        success: false,
        reason: "rate_limited",
        ip,
        userAgent,
      });

      return NextResponse.json(
        { error: `Demasiados intentos. Intenta en ${rate.retryAfterSeconds}s.` },
        { status: 429 },
      );
    }

    const user = await authenticateUser(normalizedEmail, parsed.data.password);

    if (!user) {
      consumeRateLimit(rlKey, {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockMs: 15 * 60 * 1000,
      });

      await writeAccessLog({
        email: normalizedEmail,
        success: false,
        reason: "invalid_credentials",
        ip,
        userAgent,
      });

      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    resetRateLimit(rlKey);

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await createAuthSession({
      userId: user.id,
      tokenHash: sha256(token),
      ip,
      userAgent,
    });

    await writeAccessLog({
      userId: user.id,
      email: user.email,
      success: true,
      ip,
      userAgent,
    });

    await writeAuditLog({
      userId: user.id,
      action: "login",
      module: "auth",
      detail: "Inicio de sesión exitoso",
      ip,
      userAgent,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set({
      name: PROFILE_READY_COOKIE,
      value: user.profileReady ? "true" : "false",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
