import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listAccessLogs } from "@/lib/auth-session-service";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const logs = await listAccessLogs(auth.session.sub, 25);

  return NextResponse.json({ logs });
}
