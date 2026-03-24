import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ensureDefaultUsers, reseedDefaultUsers } from "@/lib/user-service";

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const force = Boolean(payload?.force);

    if (force) {
      await reseedDefaultUsers();
      return NextResponse.json({ ok: true, mode: "reset" });
    }

    await ensureDefaultUsers();
    return NextResponse.json({ ok: true, mode: "ensure" });
  } catch {
    return NextResponse.json({ error: "No se pudo ejecutar seed de usuarios" }, { status: 500 });
  }
}
