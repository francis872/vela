import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "vela_session";
export const PROFILE_READY_COOKIE = "vela_profile_ready";

export type SessionRole = "admin" | "analista" | "operador";
export type UserRole = SessionRole;

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: SessionRole;
};

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "vela-dev-secret-change-in-production",
);

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySession(token: string) {
  const verified = await jwtVerify(token, secret);
  return verified.payload as unknown as SessionPayload;
}

type RequireRoleOk = {
  ok: true;
  session: SessionPayload;
};

type RequireRoleError = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export async function requireRole(
  request: Request,
  roles: SessionRole[],
): Promise<RequireRoleOk | RequireRoleError> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const entry = cookies.find((item) => item.startsWith(`${SESSION_COOKIE}=`));

  if (!entry) {
    return { ok: false, status: 401, error: "No hay sesión activa" };
  }

  const token = decodeURIComponent(entry.slice(`${SESSION_COOKIE}=`.length));

  try {
    const session = await verifySession(token);

    if (!roles.includes(session.role)) {
      return { ok: false, status: 403, error: "No autorizado para este recurso" };
    }

    return { ok: true, session };
  } catch {
    return { ok: false, status: 401, error: "Sesión inválida o expirada" };
  }
}