import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/engine/genome
 * Startup Genome Engine — computes 6 predictive indicators from live execution data:
 *   1. PMF Probability       — signal breadth, coverage, recency
 *   2. Death Risk            — blocked objectives, sprint failures, inactivity
 *   3. Execution Velocity    — sprint throughput, score, decision cadence
 *   4. Investment Readiness  — composite PMF + velocity + gates + safety
 *   5. Operational Health    — objective health + coverage + sprint completion
 *   6. Team Momentum         — collaboration score + network + decision recency
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.sub;

  const [objectives, signals, sprints, founderScore, gates, decisions, connections] =
    await Promise.all([
      prisma.objective.findMany({ where: { ownerId: uid } }),
      prisma.signal.findMany({
        where: { ownerId: uid },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, objectiveId: true, createdAt: true },
      }),
      prisma.sprint.findMany({ where: { ownerId: uid }, include: { items: true } }),
      prisma.founderScore.findUnique({ where: { ownerId: uid } }),
      prisma.gate.findMany({ where: { ownerId: uid }, select: { id: true, status: true } }),
      prisma.decision.findMany({
        where: { ownerId: uid },
        select: { id: true, createdAt: true },
      }),
      prisma.userConnection.count({ where: { fromUserId: uid } }),
    ]);

  const score = founderScore ?? { execution: 0, results: 0, collaboration: 0 };
  const totalScore = score.execution + score.results + score.collaboration;

  // ── Signal analysis ──────────────────────────────────────────────────────
  const signalTypes = new Set(signals.map((s) => s.type)).size;
  const coveredObjectives = new Set(
    signals.filter((s) => s.objectiveId).map((s) => s.objectiveId)
  ).size;
  const coverageRatio = objectives.length > 0 ? coveredObjectives / objectives.length : 0;
  const typeDiversity = signalTypes / 4; // 4 possible types
  const signalDensity = Math.min(1, signals.length / Math.max(objectives.length * 3, 1));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSignals = signals.filter((s) => new Date(s.createdAt) > thirtyDaysAgo);
  const signalRecency = Math.min(1, recentSignals.length / 5);

  // ── Sprint analysis ──────────────────────────────────────────────────────
  const allItems = sprints.flatMap((s) => s.items);
  const completedItems = allItems.filter((i) => i.done).length;
  const itemCompletionRate = allItems.length > 0 ? completedItems / allItems.length : 0;
  const completedSprints = sprints.filter((s) => s.status === "completed").length;
  const sprintCompletionRate = sprints.length > 0 ? completedSprints / sprints.length : 0;
  const blockedSprints = sprints.filter((s) => s.status === "blocked").length;

  // ── Objective analysis ───────────────────────────────────────────────────
  const blockedObjs = objectives.filter((o) => o.status === "blocked").length;
  const healthyObjs = objectives.filter(
    (o) => o.status === "on_track" || o.status === "completed"
  ).length;
  const objectiveHealthRate = objectives.length > 0 ? healthyObjs / objectives.length : 0;

  // ── Gate analysis ────────────────────────────────────────────────────────
  const passedGates = gates.filter((g) => g.status === "passed").length;
  const gateSuccessRate = gates.length > 0 ? passedGates / gates.length : 0;

  // ── Decision analysis ────────────────────────────────────────────────────
  const recentDecisions = decisions.filter((d) => new Date(d.createdAt) > thirtyDaysAgo);
  const decisionActivity = Math.min(1, decisions.length / 15);

  // ── 6 Genome Indicators ──────────────────────────────────────────────────

  // 1. PMF Probability
  const pmf = Math.round(
    Math.min(100, coverageRatio * 35 + typeDiversity * 25 + signalDensity * 25 + signalRecency * 15)
  );

  // 2. Death Risk (higher = more danger)
  const blockedObjPct = objectives.length > 0 ? blockedObjs / objectives.length : 0;
  const blockedSprintPct = sprints.length > 0 ? blockedSprints / sprints.length : 0;
  const scorePenalty = Math.max(0, 1 - totalScore / 300);
  const staleness = recentSignals.length === 0 && signals.length > 0 ? 0.3 : 0;
  const noActivity = signals.length === 0 && sprints.length === 0 ? 0.5 : 0;
  const deathRisk = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        blockedObjPct * 30 +
          blockedSprintPct * 20 +
          scorePenalty * 30 +
          staleness * 10 +
          noActivity * 10
      )
    )
  );

  // 3. Execution Velocity
  const velocity = Math.round(
    Math.min(
      100,
      sprintCompletionRate * 30 +
        itemCompletionRate * 25 +
        Math.min(1, score.execution / 150) * 25 +
        decisionActivity * 20
    )
  );

  // 4. Investment Readiness
  const readiness = Math.round(
    Math.min(
      100,
      pmf * 0.3 + velocity * 0.25 + gateSuccessRate * 100 * 0.25 + (100 - deathRisk) * 0.2
    )
  );

  // 5. Operational Health
  const health = Math.round(
    Math.min(100, objectiveHealthRate * 40 + coverageRatio * 30 + itemCompletionRate * 30)
  );

  // 6. Team Momentum
  const connectionScore = Math.min(1, connections / 10);
  const collabNorm = Math.min(1, score.collaboration / 100);
  const decisionRecency = Math.min(1, recentDecisions.length / 3);
  const momentum = Math.round(
    Math.min(100, collabNorm * 45 + connectionScore * 30 + decisionRecency * 25)
  );

  // ── Composite: Startup Health Index ─────────────────────────────────────
  const startupHealthIndex = Math.round(
    pmf * 0.2 +
      velocity * 0.2 +
      (100 - deathRisk) * 0.2 +
      readiness * 0.15 +
      health * 0.15 +
      momentum * 0.1
  );

  function insight(id: string, v: number): string {
    if (id === "pmf") {
      if (v >= 70) return `${signals.length} señales · ${signalTypes} tipos capturados`;
      if (v >= 40) return `Amplía validación — ${4 - signalTypes} tipo(s) faltantes`;
      return "Sin validación de mercado activa";
    }
    if (id === "death") {
      if (v >= 60) return `${blockedObjs} objetivo(s) bloqueado(s) — riesgo crítico`;
      if (v >= 30) return "Velocidad baja · Revisa objetivos bloqueados";
      return "Riesgo bajo · Mantén el ritmo";
    }
    if (id === "velocity") {
      if (v >= 70) return `${completedSprints}/${sprints.length} sprints completados`;
      if (v >= 40) return `${completedItems}/${allItems.length} compromisos cumplidos`;
      return "Acelera — crea un sprint ahora";
    }
    if (id === "readiness") {
      if (v >= 70) return `${passedGates} gate(s) pasado(s) · Listo para conversación`;
      if (v >= 40) return "Mejora PMF + ejecución para atraer capital";
      return "Construye tracción antes de buscar inversión";
    }
    if (id === "health") {
      if (v >= 70) return `${healthyObjs}/${objectives.length} objetivos en verde`;
      if (v >= 40) return "Revisa objetivos en riesgo";
      return "Operación crítica · Prioriza desbloqueadores";
    }
    if (id === "momentum") {
      if (v >= 70) return `Red activa · ${connections} conexión(es) en plataforma`;
      if (v >= 40) return "Aumenta actividad en relay y decisiones";
      return "Sin momentum — conecta y colabora";
    }
    return "";
  }

  return NextResponse.json({
    startupHealthIndex,
    indicators: [
      { id: "pmf",       label: "PMF Probability",      value: pmf,       insight: insight("pmf", pmf) },
      { id: "death",     label: "Death Risk",           value: deathRisk,  insight: insight("death", deathRisk), inverse: true },
      { id: "velocity",  label: "Execution Velocity",   value: velocity,   insight: insight("velocity", velocity) },
      { id: "readiness", label: "Investment Readiness", value: readiness,  insight: insight("readiness", readiness) },
      { id: "health",    label: "Operational Health",   value: health,     insight: insight("health", health) },
      { id: "momentum",  label: "Team Momentum",        value: momentum,   insight: insight("momentum", momentum) },
    ],
    meta: {
      totalSignals: signals.length,
      signalTypes,
      totalObjectives: objectives.length,
      blockedObjectives: blockedObjs,
      totalSprints: sprints.length,
      completedSprints,
      passedGates,
      totalGates: gates.length,
      totalDecisions: decisions.length,
      connections,
      totalScore,
    },
  });
}
