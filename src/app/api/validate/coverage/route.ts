import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCoverage, CoverageNode } from "@/lib/graph";

export const dynamic = "force-dynamic";

/** GET /api/validate/coverage — bipartite Objectives ↔ Signals analysis */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  return NextResponse.json({
    nodes,
    analysis,
    totalSignals: signals.length,
    unlinkedSignals: unlinkedSignals.length,
  });
}
