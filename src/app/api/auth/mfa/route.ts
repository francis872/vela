import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { requireProfileReady } from "@/lib/profile-gate";
import {
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  startMfaEnrollment,
} from "@/lib/mfa-service";
import { getRequestMeta } from "@/lib/security";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";

const confirmSchema = z.object({ code: z.string().min(6).max(12) });

/** GET /api/auth/mfa — current MFA status for the authenticated user. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const status = await getMfaStatus(auth.session.sub);
  return NextResponse.json(status);
}

/** POST /api/auth/mfa — action: "start" | "confirm" | "disable" */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const meta = getRequestMeta(request);

  const profileGate = await requireProfileReady(session.sub);
  if (profileGate) return profileGate;

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;

  if (action === "start") {
    const setup = await startMfaEnrollment(session.sub, session.email);
    // recoveryCodes and secret are returned ONCE; the client must store them.
    return NextResponse.json(setup, { status: 201 });
  }

  if (action === "confirm") {
    const rlKey = `mfa-confirm:${session.sub}`;
    const rate = checkRateLimit(rlKey, { maxAttempts: 5, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: `Demasiados intentos. Intenta en ${rate.retryAfterSeconds}s.` }, { status: 429 });
    }

    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const ok = await confirmMfaEnrollment(session.sub, parsed.data.code, meta);
    if (!ok) {
      consumeRateLimit(rlKey, { maxAttempts: 5, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 });
      return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, enabled: true });
  }

  if (action === "disable") {
    await disableMfa(session.sub, meta);
    return NextResponse.json({ ok: true, enabled: false });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
