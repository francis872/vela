import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/user-service";
import { issueVerificationToken } from "@/lib/email-verification-service";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/security";

const resendSchema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const { ip, userAgent } = getRequestMeta(request);
  const payload = await request.json().catch(() => null);
  const parsed = resendSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const rlKey = `resend-verification:${ip}:${email}`;
  const rate = checkRateLimit(rlKey, {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta en ${rate.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  consumeRateLimit(rlKey, {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000,
  });

  // Never reveal whether the account exists or its state.
  const user = await findUserByEmail(email);
  if (!user || user.emailVerifiedAt) {
    return NextResponse.json({ ok: true });
  }

  const origin = new URL(request.url).origin;
  await issueVerificationToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    origin,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
