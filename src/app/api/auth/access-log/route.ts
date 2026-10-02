import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { listAccessLogs } from "@/lib/auth-session-service";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return auth.response;
  }

  const logs = await listAccessLogs(auth.session.sub, 25);

  return NextResponse.json({ logs });
}
