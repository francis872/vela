import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { analyzeCoverage, CoverageNode } from "@/lib/graph";
import { normalizeNextToValidate, ValidationCoverageResponse } from "@/lib/functional-contracts";

export const dynamic = "force-dynamic";

/** GET /api/validate/coverage — bipartite Objectives ↔ Signals analysis */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const [objectives, signals] = await Promise.all([
    prisma.objective.findMany({
      where: { ownerId: session.sub },
      orderBy: { priority: "asc" },
    }),
    prisma.signal.findMany({
      where: { ownerId: session.sub },
      select: { id: true, type: true, objectiveId: true, title: true, createdAt: true },
    }),
  ]);

  // Build signal map per objective
  const signalMap: Record<string, { count: number; types: string[] }> = {};
  for (const o of objectives) signalMap[o.id] = { count: 0, types: [] };

  for (const s of signals) {
    if (s.objectiveId && signalMap[s.objectiveId]) {
      signalMap[s.objectiveId].count++;
      if (!signalMap[s.objectiveId].types.includes(s.type)) {
        signalMap[s.objectiveId].types.push(s.type);
      }
    }
  }

  const nodes: CoverageNode[] = objectives.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    signalCount: signalMap[o.id]?.count ?? 0,
    signalTypes: signalMap[o.id]?.types ?? [],
  }));

  const analysis = analyzeCoverage(nodes);

  // Unlinked signals (not attached to any objective)
  const unlinkedSignals = signals.filter((s) => !s.objectiveId);

  const response: ValidationCoverageResponse = {
    nodes,
    analysis: {
      ...analysis,
      nextToValidate: normalizeNextToValidate(analysis.nextToValidate),
    },
    totalSignals: signals.length,
    unlinkedSignals: unlinkedSignals.length,
  };

  return NextResponse.json(response);
}
