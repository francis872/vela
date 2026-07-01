import { NextResponse } from "next/server";
import { PROFILE_READY_COOKIE, SESSION_COOKIE, requireRole } from "@/lib/auth";
import { revokeAllAuthSessions } from "@/lib/auth-session-service";
import { writeAuditLog } from "@/lib/audit-service";
import { getRequestMeta } from "@/lib/security";

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { ip, userAgent } = getRequestMeta(request);

  await revokeAllAuthSessions(auth.session.sub);
  await writeAuditLog({
    userId: auth.session.sub,
    action: "logout_all",
    module: "auth",
    detail: "Cierre de todas las sesiones",
    ip,
    userAgent,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: PROFILE_READY_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
