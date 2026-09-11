import { prisma } from "@/lib/prisma";

/**
 * Venture metrics — reproducible computations over REAL operational data.
 *
 * Rules:
 * - Every rate carries its sample size.
 * - Ratios with zero denominator return status INSUFFICIENT_DATA, never 0.
 * - No fabricated precision: callers must check `status` before rendering.
 */

export type DataStatus = "AVAILABLE" | "INSUFFICIENT_DATA";

export type RatioResult = {
  status: DataStatus;
  value: number | null; // 0..1 when AVAILABLE
  sampleSize: number;
};

export function ratio(numerator: number, denominator: number): RatioResult {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return { status: "INSUFFICIENT_DATA", value: null, sampleSize: Math.max(0, denominator) };
  }
  return { status: "AVAILABLE", value: numerator / denominator, sampleSize: denominator };
}

export type VentureStats = {
  objectives: {
    total: number;
    completed: number;
    blocked: number;
    atRisk: number;
    onTrack: number;
  };
  signals: {
    total: number;
    experiments: number;
    interviews: number;
    metrics: number;
    insights: number;
    linkedToObjective: number;
    last30d: number;
    lastSignalAt: Date | null;
  };
  sprints: {
    total: number;
    completed: number;
    blocked: number;
    items: number;
    itemsDone: number;
  };
  gates: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
  decisions: {
    total: number;
    last30d: number;
  };
};

export async function collectVentureStats(ownerId: string): Promise<VentureStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [objectives, signals, sprints, gates, decisions] = await Promise.all([
    prisma.objective.findMany({
      where: { ownerId },
      select: { status: true },
    }),
    prisma.signal.findMany({
      where: { ownerId },
      select: { type: true, objectiveId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sprint.findMany({
      where: { ownerId },
      select: { status: true, items: { select: { done: true } } },
    }),
    prisma.gate.findMany({
      where: { ownerId },
      select: { status: true },
    }),
    prisma.decision.findMany({
      where: { ownerId },
      select: { createdAt: true },
    }),
  ]);

  const allItems = sprints.flatMap((sprint) => sprint.items);

  return {
    objectives: {
      total: objectives.length,
      completed: objectives.filter((o) => o.status === "completed").length,
      blocked: objectives.filter((o) => o.status === "blocked").length,
      atRisk: objectives.filter((o) => o.status === "at_risk").length,
      onTrack: objectives.filter((o) => o.status === "on_track").length,
    },
    signals: {
      total: signals.length,
      experiments: signals.filter((s) => s.type === "experiment").length,
      interviews: signals.filter((s) => s.type === "interview").length,
      metrics: signals.filter((s) => s.type === "metric").length,
      insights: signals.filter((s) => s.type === "insight").length,
      linkedToObjective: signals.filter((s) => s.objectiveId).length,
      last30d: signals.filter((s) => s.createdAt >= thirtyDaysAgo).length,
      lastSignalAt: signals[0]?.createdAt ?? null,
    },
    sprints: {
      total: sprints.length,
      completed: sprints.filter((s) => s.status === "completed").length,
      blocked: sprints.filter((s) => s.status === "blocked").length,
      items: allItems.length,
      itemsDone: allItems.filter((item) => item.done).length,
    },
    gates: {
      total: gates.length,
      passed: gates.filter((g) => g.status === "passed").length,
      failed: gates.filter((g) => g.status === "failed").length,
      pending: gates.filter((g) => g.status === "pending").length,
    },
    decisions: {
      total: decisions.length,
      last30d: decisions.filter((d) => d.createdAt >= thirtyDaysAgo).length,
    },
  };
}
