import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  QUICK_ACTIONS,
  type QuickActionKey,
} from "@/lib/quick-actions";
import { listRecentQuickActions, recordQuickAction } from "@/lib/quick-actions-service";

const actionKeys = Object.keys(QUICK_ACTIONS) as [QuickActionKey, ...QuickActionKey[]];
const modules = ["lums", "insights", "builder-lab", "capital-ops"] as const;

const quickActionSchema = z.object({
  actionKey: z.enum(actionKeys),
  module: z.enum(modules),
  context: z.string().max(300).optional(),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const executions = await listRecentQuickActions(parsed.data.limit);
    return NextResponse.json({ executions });
  } catch {
    return NextResponse.json({ error: "No se pudo obtener historial de acciones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = quickActionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const action = QUICK_ACTIONS[parsed.data.actionKey];

  if (action.module !== parsed.data.module) {
    return NextResponse.json({ error: "La acción no coincide con el módulo" }, { status: 400 });
  }

  try {
    const execution = await recordQuickAction({
      actionKey: parsed.data.actionKey,
      module: parsed.data.module,
      userId: auth.session.sub,
      userEmail: auth.session.email,
      context: parsed.data.context,
    });

    return NextResponse.json({ execution });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la acción" }, { status: 500 });
  }
}
