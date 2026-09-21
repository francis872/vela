import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { collectVentureStats } from "@/lib/venture-metrics";
import { assessExecutionRisk, assessTrajectory, assessValidationGap } from "@/lib/predictions";
import { synthesizeEngineIntelligence } from "@/lib/engine-intelligence";
import { computeVelaAlgorithms } from "@/lib/computational-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;

  const [sprints, objectives, signals, score, gates, decisions, connections, stats] = await Promise.all([
    prisma.sprint.findMany({ where: { ownerId }, include: { items: true }, orderBy: { weekStart: "desc" } }),
    prisma.objective.findMany({ where: { ownerId } }),
    prisma.signal.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
    prisma.founderScore.findUnique({ where: { ownerId } }),
    prisma.gate.findMany({ where: { ownerId } }),
    prisma.decision.findMany({ where: { ownerId } }),
    prisma.userConnection.count({ where: { fromUserId: ownerId } }),
    collectVentureStats(ownerId),
  ]);

  const active = sprints.find((sprint) => sprint.status === "active") ?? sprints.find((sprint) => sprint.status === "blocked") ?? null;
  const activeDone = active?.items.filter((item) => item.done).length ?? 0;
  const activeTotal = active?.items.length ?? 0;
  const activeSprint = active ? {
    id: active.id,
    title: active.title,
    status: active.status,
    completion: activeTotal ? Math.round((activeDone / activeTotal) * 100) : 0,
    remaining: Math.max(0, activeTotal - activeDone),
  } : null;

  const signalTypes = new Set(signals.map((signal) => signal.type)).size;
  const coveredObjectives = new Set(signals.filter((signal) => signal.objectiveId).map((signal) => signal.objectiveId)).size;
  const coverageRatio = objectives.length ? coveredObjectives / objectives.length : 0;
  const typeDiversity = signalTypes / 4;
  const signalDensity = Math.min(1, signals.length / Math.max(objectives.length * 3, 1));
  const recentCutoff = new Date(Date.now() - 30 * 86400000);
  const recentSignals = signals.filter((signal) => signal.createdAt > recentCutoff);
  const pmf = signals.length ? Math.round(Math.min(100, coverageRatio * 35 + typeDiversity * 25 + signalDensity * 25 + Math.min(1, recentSignals.length / 5) * 15)) : null;

  const allItems = sprints.flatMap((sprint) => sprint.items);
  const itemCompletion = allItems.length ? allItems.filter((item) => item.done).length / allItems.length : 0;
  const sprintCompletion = sprints.length ? sprints.filter((sprint) => sprint.status === "completed").length / sprints.length : 0;
  const blockedObjectives = objectives.filter((objective) => objective.status === "blocked").length;
  const blockedSprints = sprints.filter((sprint) => sprint.status === "blocked").length;
  const totalScore = (score?.execution ?? 0) + (score?.results ?? 0) + (score?.collaboration ?? 0);
  const risk = objectives.length || sprints.length || signals.length
    ? Math.round(Math.min(100,
        (objectives.length ? blockedObjectives / objectives.length : 0) * 30 +
        (sprints.length ? blockedSprints / sprints.length : 0) * 20 +
        Math.max(0, 1 - totalScore / 300) * 30 +
        (signals.length && !recentSignals.length ? 3 : 0) +
        (!signals.length && !sprints.length ? 5 : 0)
      ))
    : null;
  const velocity = sprints.length || decisions.length
    ? Math.round(Math.min(100, sprintCompletion * 30 + itemCompletion * 25 + Math.min(1, (score?.execution ?? 0) / 150) * 25 + Math.min(1, decisions.length / 15) * 20))
    : null;
  const health = objectives.length || allItems.length
    ? Math.round(Math.min(100,
        (objectives.length ? objectives.filter((o) => o.status === "on_track" || o.status === "completed").length / objectives.length : 0) * 40 +
        coverageRatio * 30 + itemCompletion * 30
      ))
    : null;
  const gateSuccess = gates.length ? gates.filter((gate) => gate.status === "passed").length / gates.length : 0;
  const readiness = objectives.length || sprints.length || signals.length
    ? Math.round((pmf ?? 0) * .3 + (velocity ?? 0) * .25 + gateSuccess * 25 + (100 - (risk ?? 0)) * .2)
    : null;
  const recentDecisions = decisions.filter((decision) => decision.createdAt > recentCutoff).length;
  const momentum = connections || decisions.length || (score?.collaboration ?? 0)
    ? Math.round(Math.min(100, Math.min(1, (score?.collaboration ?? 0) / 100) * 45 + Math.min(1, connections / 10) * 30 + Math.min(1, recentDecisions / 3) * 25))
    : null;
  const available = [pmf, velocity, risk === null ? null : 100 - risk, readiness, health, momentum].filter((value): value is number => value !== null);
  const shi = available.length ? Math.round(available.reduce((sum, value) => sum + value, 0) / available.length) : null;

  const trajectory = assessTrajectory(stats);
  const executionRisk = assessExecutionRisk(stats);
  const validationRisk = assessValidationGap(stats);
  const algorithms = await computeVelaAlgorithms(ownerId);
  const intelligence = synthesizeEngineIntelligence({
    activeSprint,
    genome: { shi, pmf, risk, velocity, readiness, health, momentum },
    trajectory: {
      status: trajectory.status,
      executionRisk: executionRisk.level,
      validationRisk: validationRisk.level,
      factors: trajectory.factors,
    },
  });

  const executionPlan = {
    selected: algorithms.optimization.selectedObjectives,
    deferred: algorithms.optimization.deferredObjectives,
    capacity: algorithms.optimization.capacity,
    score: algorithms.optimization.plan.score,
    systemicRisk: algorithms.risk.topSystemicRisks[0] ?? null,
    historicalAnalogue: algorithms.similarity.closest,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    intelligence,
    executionPlan,
    activeSprint,
    operating: { shi, pmf, risk, velocity, readiness, health, momentum },
    trajectory: { status: trajectory.status, factors: trajectory.factors, executionRisk, validationRisk },
  });
}
