import { SignJWT, jwtVerify } from "jose";

export type UserRole = "admin" | "analista" | "operador";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

export function getDefaultRouteByRole(role: UserRole) {
  if (role === "admin") {
    return "/admin/users";
  }

  if (role === "analista") {
    return "/dashboard";
  }

  return "/velaseed";
}

export function getDefaultPortalByRole(role: UserRole) {
  if (role === "admin") {
    return "/access/admin";
  }

  if (role === "analista") {
    return "/access/dashboard";
  }

  return "/access/velaseed";
}

export const SESSION_COOKIE = "vela_session";
export const PROFILE_READY_COOKIE = "vela_profile_ready";

const encoder = new TextEncoder();
const secret = encoder.encode(
  process.env.AUTH_SECRET || "vela-dev-secret-change-in-production",
);

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "admin" &&
        payload.role !== "analista" &&
        payload.role !== "operador")
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    } as SessionPayload;
  } catch {
    return null;
  }
}

function extractCookie(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((chunk) => chunk.trim());
  const found = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));

  if (!found) {
    return null;
  }

  return decodeURIComponent(found.substring(cookieName.length + 1));
}

export async function requireRole(request: Request, allowedRoles: UserRole[]) {
  const token = extractCookie(request, SESSION_COOKIE);

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "No autenticado",
    };
  }

  const session = await verifySession(token);

  if (!session) {
    return {
      ok: false as const,
      status: 401,
      error: "Sesión inválida",
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "Sin permisos para este recurso",
    };
  }

  return {
    ok: true as const,
    session,
  };
}
