import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createIntervention, listInterventions } from "@/lib/intervention-engine";
import { dispatchDomainEvent } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const interventions = await listInterventions(auth.session.sub);
  return NextResponse.json({ interventions });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.hypothesis !== "string" || typeof body.targetMetric !== "string" || typeof body.actionTitle !== "string" || typeof body.actionHref !== "string") {
    return NextResponse.json({ error: "Invalid intervention proposal." }, { status: 400 });
  }

  const intervention = await createIntervention(auth.session.sub, {
    title: body.title,
    hypothesis: body.hypothesis,
    source: typeof body.source === "string" ? body.source : "home",
    sourceEvidence: Array.isArray(body.sourceEvidence) ? body.sourceEvidence.filter((item: unknown): item is string => typeof item === "string") : [],
    targetMetric: body.targetMetric,
    baselineValue: typeof body.baselineValue === "number" ? body.baselineValue : null,
    targetDelta: typeof body.targetDelta === "number" ? body.targetDelta : 10,
    deadlineDays: typeof body.deadlineDays === "number" ? Math.min(30, Math.max(1, body.deadlineDays)) : 7,
    actionTitle: body.actionTitle,
    actionHref: body.actionHref,
  });

  await dispatchDomainEvent("intervention_started", { interventionId: intervention.id, ownerId: auth.session.sub, targetMetric: intervention.targetMetric });
  return NextResponse.json({ intervention }, { status: 201 });
}
