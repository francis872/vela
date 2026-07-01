import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findUserByEmail } from "@/lib/user-service";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { generateSecureToken, getRequestMeta, sha256 } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit-service";

type TurnstileResponse = {
  success: boolean;
};

const forgotSchema = z.object({
  email: z.email(),
  captchaToken: z.string().optional(),
});

async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return true;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as TurnstileResponse;
  return Boolean(result.success);
}

export async function POST(request: Request) {
  const { ip, userAgent } = getRequestMeta(request);
  const payload = await request.json().catch(() => null);
  const parsed = forgotSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const rlKey = `forgot:${ip}:${email}`;
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

  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!parsed.data.captchaToken) {
      return NextResponse.json({ error: "Captcha requerido" }, { status: 400 });
    }

    const captchaOk = await verifyTurnstile(parsed.data.captchaToken, ip);
    if (!captchaOk) {
      consumeRateLimit(rlKey, {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockMs: 15 * 60 * 1000,
      });
      return NextResponse.json({ error: "Captcha inválido" }, { status: 400 });
    }
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = generateSecureToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const origin = new URL(request.url).origin;
  const publicOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
  const resetUrl = `${publicOrigin}/reset-password?token=${token}`;

  await writeAuditLog({
    userId: user.id,
    action: "password_reset_requested",
    module: "auth",
    detail: `Reset solicitado. URL emitida para ${publicOrigin}/reset-password`,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
