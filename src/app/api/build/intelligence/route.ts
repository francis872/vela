import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { synthesizeBuildIntelligence } from "@/lib/build-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const ownerId = auth.session.sub;
  const [objectives, dependencies, totalSignals] = await Promise.all([
    prisma.objective.findMany({
      where: { ownerId },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      include: { signals: { select: { type: true } } },
    }),
    prisma.objectiveDependency.findMany({
      where: { ownerId },
      select: { objectiveId: true, dependsOnId: true },
    }),
    prisma.signal.count({ where: { ownerId } }),
  ]);

  const intelligence = synthesizeBuildIntelligence({
    objectives: objectives.map((objective) => ({
      id: objective.id,
      title: objective.title,
      status: objective.status,
      priority: objective.priority,
      dueDate: objective.dueDate?.toISOString() ?? null,
      signalCount: objective.signals.length,
      signalTypes: [...new Set(objective.signals.map((signal) => signal.type))],
    })),
    edges: dependencies.map((dependency) => ({
      from: dependency.objectiveId,
      to: dependency.dependsOnId,
    })),
    totalSignals,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    intelligence,
  });
}
