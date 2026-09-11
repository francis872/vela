import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, signSession, verifySession, PROFILE_READY_COOKIE } from "@/lib/auth";
import { verifyMfaChallenge } from "@/lib/mfa-service";
import { checkRateLimit, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/security";
import { prisma } from "@/lib/prisma";

const challengeSchema = z.object({ code: z.string().min(6).max(12) });

/**
 * POST /api/auth/mfa/challenge
 *
 * Completes a login that is pending a second factor. The request must carry a
 * session cookie with `mfaPending: true`; a valid TOTP or recovery code
 * upgrades it to a full session.
 */
export async function POST(request: NextRequest) {
  const { ip, userAgent } = getRequestMeta(request);
  const cookieHeader = request.headers.get("cookie") || "";
  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  if (!raw) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const session = await verifySession(decodeURIComponent(raw)).catch(() => null);
  if (!session || !session.mfaPending) {
    return NextResponse.json({ error: "No hay un reto MFA pendiente" }, { status: 401 });
  }

  const rlKey = `mfa-challenge:${session.sub}:${ip}`;
  const rate = checkRateLimit(rlKey, { maxAttempts: 5, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta en ${rate.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = challengeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const ok = await verifyMfaChallenge(session.sub, parsed.data.code, { ip, userAgent });
  if (!ok) {
    consumeRateLimit(rlKey, { maxAttempts: 5, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 });
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  resetRateLimit(rlKey);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, profileReady: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 401 });
  }

  // Upgrade to a full (non-pending) session.
  const fullToken = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const response = NextResponse.json({ ok: true, user: { role: user.role } });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: fullToken,
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
}
