import { NextResponse } from "next/server";
import { PROFILE_READY_COOKIE, SESSION_COOKIE } from "@/lib/auth";
import { requireRole } from "@/lib/auth";
import { revokeAuthSession } from "@/lib/auth-session-service";
import { writeAuditLog } from "@/lib/audit-service";
import { getRequestMeta, sha256 } from "@/lib/security";

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { ip, userAgent } = getRequestMeta(request);
  const cookieHeader = request.headers.get("cookie") || "";
  const rawSession = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  if (rawSession) {
    await revokeAuthSession(sha256(decodeURIComponent(rawSession)));
  }

  await writeAuditLog({
    userId: auth.session.sub,
    action: "logout",
    module: "auth",
    detail: "Cierre de sesión",
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
