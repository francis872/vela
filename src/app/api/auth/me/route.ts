import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { touchAuthSession } from "@/lib/auth-session-service";
import { sha256 } from "@/lib/security";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const rawSession = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith("vela_session="))
    ?.split("=")[1];

  if (rawSession) {
    await touchAuthSession(sha256(decodeURIComponent(rawSession)));
  }

  return NextResponse.json({ user: auth.session });
}
