import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySession,
  type SessionPayload,
  type SessionRole,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { touchAuthSession } from "@/lib/auth-session-service";

export const ALL_ROLES: SessionRole[] = ["admin", "analista", "operador"];

type AuthOk = { ok: true; session: SessionPayload };
type AuthFail = { ok: false; response: NextResponse };

function extractToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const entry = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE}=`));

  if (!entry) return null;
  return decodeURIComponent(entry.slice(`${SESSION_COOKIE}=`.length));
}

/**
 * Session guard for API route handlers (Node runtime only — uses Prisma).
 *
 * Unlike `verifySession` (pure JWT, safe for middleware), this also verifies
 * that the persisted AuthSession has not been revoked, so logout-all and
 * password resets take effect immediately instead of waiting for JWT expiry.
 */
export async function requireAuth(
  request: Request,
  roles: SessionRole[] = ALL_ROLES,
): Promise<AuthOk | AuthFail> {
  const token = extractToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const session = await verifySession(token).catch(() => null);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sesión inválida o expirada" },
        { status: 401 },
      ),
    };
  }

  const tokenHash = sha256(token);
  const record = await prisma.authSession.findUnique({
    where: { tokenHash },
    select: { revokedAt: true },
  });

  if (!record || record.revokedAt) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sesión revocada" }, { status: 401 }),
    };
  }

  // A partial login (MFA pending) cannot access application resources until
  // the second factor is verified via /api/auth/mfa/challenge.
  if (session.mfaPending) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Se requiere verificación de segundo factor", mfaRequired: true }, { status: 401 }),
    };
  }

  // Best-effort activity tracking; never block the request on it.
  touchAuthSession(tokenHash).catch(() => undefined);

  if (!roles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No autorizado para este recurso" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session };
}
