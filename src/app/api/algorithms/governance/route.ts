import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { evaluateGovernance, rollbackChampion } from "@/lib/algorithm-governance";
import { getAlgorithmParameters } from "@/lib/algorithm-learning";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req); if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;
  const [registry, experiments, events, adaptive] = await Promise.all([
    prisma.algorithmRegistry.findMany({ where: { ownerId }, orderBy: [{ family: "asc" }, { createdAt: "desc" }] }),
    prisma.algorithmExperiment.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.algorithmGovernanceEvent.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 50 }),
    getAlgorithmParameters(ownerId),
  ]);
  return NextResponse.json({
    registry, experiments, events,
    adaptiveProfile: { available: adaptive.sampleCount > 0, sampleCount: adaptive.sampleCount },
    policy: {
      challengerActsOnProduction: false,
      minimumSamples: 8,
      promotionDelta: 0.08,
      rollbackDelta: 0.12,
      manualRollback: true,
      auditable: true,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req); if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (body.action === "evaluate") return NextResponse.json(await evaluateGovernance(auth.session.sub));
  if (body.action === "rollback") {
    if (!body.reason?.trim()) return NextResponse.json({ error: "rollback reason required" }, { status: 400 });
    return NextResponse.json(await rollbackChampion(auth.session.sub, body.reason.trim()));
  }
  return NextResponse.json({ error: "action must be evaluate or rollback" }, { status: 400 });
}
