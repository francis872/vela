import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { listActiveAuthSessions } from "@/lib/auth-session-service";
import { sha256 } from "@/lib/security";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return auth.response;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const rawSession = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];
  const currentTokenHash = rawSession ? sha256(decodeURIComponent(rawSession)) : null;

  const sessions = await listActiveAuthSessions(auth.session.sub);

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      ip: session.ip,
      userAgent: session.userAgent,
      isCurrent: Boolean(currentTokenHash && session.tokenHash === currentTokenHash),
    })),
  });
}
