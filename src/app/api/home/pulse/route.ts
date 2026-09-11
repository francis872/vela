import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { collectVentureStats } from "@/lib/venture-metrics";
import { assessExecutionRisk, assessTrajectory, assessValidationGap } from "@/lib/predictions";
import { metricResult, type MetricResult } from "@/lib/functional-contracts";

export const dynamic = "force-dynamic";

type PulseAction = { id: string; title: string; reason: string; href: string; priority: "high" | "medium" | "low" };

type ActivityItem = { id: string; kind: string; title: string; detail: string; createdAt: string };

function readinessResult(stats: Awaited<ReturnType<typeof collectVentureStats>>): MetricResult {
  if (stats.gates.total === 0 && stats.signals.total === 0 && stats.objectives.total === 0) {
    return metricResult(null, false, { label: "Capital Readiness", explanation: "Define gates, objectives or validation evidence to calculate readiness.", sampleSize: 0 });
  }
  const components = [
    { weight: 0.5, value: stats.gates.total > 0 ? stats.gates.passed / stats.gates.total : null },
    { weight: 0.3, value: stats.signals.total > 0 ? ((stats.signals.interviews > 0 ? 1 : 0) + (stats.signals.experiments > 0 ? 1 : 0) + (stats.signals.metrics > 0 ? 1 : 0) + (stats.signals.insights > 0 ? 1 : 0)) / 4 : null },
    { weight: 0.2, value: stats.objectives.total > 0 ? stats.objectives.completed / stats.objectives.total : null },
  ];
  const available = components.filter((component) => component.value !== null);
  if (available.length === 0) return metricResult(null, false, { label: "Capital Readiness", explanation: "Define gates, objectives or validation evidence to calculate readiness.", sampleSize: 0 });
  const weight = available.reduce((sum, component) => sum + component.weight, 0);
  const score = available.reduce((sum, component) => sum + component.weight * (component.value ?? 0), 0);
  return metricResult(Math.round((score / weight) * 100), true, {
    label: "Capital Readiness",
    explanation: `Backend calculation using ${stats.gates.passed}/${stats.gates.total} gates, ${stats.signals.total} signals and ${stats.objectives.completed}/${stats.objectives.total} completed objectives.`,
    sampleSize: stats.gates.total + stats.signals.total + stats.objectives.total,
  });
}

function velocityResult(stats: Awaited<ReturnType<typeof collectVentureStats>>): MetricResult {
  if (stats.sprints.total === 0 && stats.decisions.total === 0) {
    return metricResult(null, false, { label: "Execution Velocity", explanation: "Create a Sprint or record a decision to calculate execution velocity.", sampleSize: 0 });
  }
  const sprintRate = stats.sprints.total > 0 ? stats.sprints.completed / stats.sprints.total : 0;
  const itemRate = stats.sprints.items > 0 ? stats.sprints.itemsDone / stats.sprints.items : 0;
  const decisionRate = Math.min(1, stats.decisions.total / 15);
  return metricResult(Math.round(Math.min(100, sprintRate * 45 + itemRate * 35 + decisionRate * 20)), true, {
    label: "Execution Velocity",
    explanation: "Calculated from Sprint throughput, completed commitments and decision cadence.",
    sampleSize: stats.sprints.total + stats.sprints.items + stats.decisions.total,
  });
}

function validationResult(stats: Awaited<ReturnType<typeof collectVentureStats>>): MetricResult {
  if (stats.signals.total === 0) return metricResult(null, false, { label: "Validation Activity", explanation: "Record an interview, experiment, metric or insight to establish validation evidence.", sampleSize: 0 });
  const breadth = [stats.signals.interviews, stats.signals.experiments, stats.signals.metrics, stats.signals.insights].filter(Boolean).length;
  return metricResult(Math.round(Math.min(100, stats.signals.total * 10 + breadth * 15)), true, {
    label: "Validation Activity",
    explanation: `${stats.signals.total} real signal(s), including ${stats.signals.interviews} interview(s).`,
    sampleSize: stats.signals.total,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;
  const stats = await collectVentureStats(ownerId);

  const [venture, objectives, signals, sprints, gates, decisions] = await Promise.all([
    prisma.venture.findUnique({ where: { userId: ownerId }, select: { id: true, name: true, sector: true, stage: true, description: true } }),
    prisma.objective.findMany({ where: { ownerId }, orderBy: [{ priority: "asc" }, { updatedAt: "desc" }], take: 8, select: { id: true, title: true, status: true, dueDate: true, updatedAt: true } }),
    prisma.signal.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, type: true, title: true, createdAt: true } }),
    prisma.sprint.findMany({ where: { ownerId }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.gate.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, status: true, updatedAt: true } }),
    prisma.decision.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, createdAt: true } }),
  ]);

  const currentSprint = sprints.find((sprint) => sprint.status === "active") ?? sprints[0] ?? null;
  const executionRisk = assessExecutionRisk(stats);
  const validationRisk = assessValidationGap(stats);
  const trajectory = assessTrajectory(stats);
  const metrics = {
    velocity: velocityResult(stats),
    validation: validationResult(stats),
    risk: metricResult(executionRisk.level === "HIGH" ? 80 : executionRisk.level === "MEDIUM" ? 50 : 20, executionRisk.status === "AVAILABLE", { label: "Risk", explanation: executionRisk.factors.join(" · "), sampleSize: stats.objectives.total + stats.sprints.total }),
    readiness: readinessResult(stats),
    completedSprints: metricResult(stats.sprints.completed, stats.sprints.total > 0, { label: "Completed Sprints", explanation: "Persisted Sprints with completed status.", sampleSize: stats.sprints.total }),
    activeObjectives: metricResult(stats.objectives.total - stats.objectives.completed, stats.objectives.total > 0, { label: "Active Objectives", explanation: "Objectives not marked completed.", sampleSize: stats.objectives.total }),
    interviews: metricResult(stats.signals.interviews, stats.signals.total > 0, { label: "Total Interviews", explanation: "Persisted interview signals.", sampleSize: stats.signals.total }),
    insights: metricResult(stats.signals.insights, stats.signals.total > 0, { label: "Validated Insights", explanation: "Persisted insight signals.", sampleSize: stats.signals.total }),
    momentum: metricResult(null, false, { label: "Team Momentum", explanation: "Team activity evidence is not available for this venture yet.", sampleSize: 0 }),
  };

  const nextActions: PulseAction[] = [];
  for (const objective of objectives.filter((item) => item.status === "blocked" || item.status === "at_risk").slice(0, 2)) {
    nextActions.push({ id: `objective-${objective.id}`, title: objective.status === "blocked" ? "Resolve blocked objective" : "Review at-risk objective", reason: objective.title, href: "/build", priority: objective.status === "blocked" ? "high" : "medium" });
  }
  if (stats.signals.interviews === 0) nextActions.push({ id: "validation-interview", title: "Record a customer interview", reason: "Validation evidence is missing", href: "/validate", priority: "high" });
  if (stats.gates.total === 0) nextActions.push({ id: "capital-gates", title: "Define capital gates", reason: "Readiness cannot use gate evidence yet", href: "/capital", priority: "medium" });
  if (stats.sprints.total === 0) nextActions.push({ id: "first-sprint", title: "Create the first Sprint", reason: "Execution cadence is not established", href: "/engine", priority: "medium" });

  const activity: ActivityItem[] = [
    ...sprints.map((item) => ({ id: `sprint-${item.id}`, kind: item.status === "completed" ? "sprint_completed" : "sprint_created", title: item.status === "completed" ? "Sprint completed" : "Sprint created", detail: item.title, createdAt: item.updatedAt.toISOString() })),
    ...signals.map((item) => ({ id: `signal-${item.id}`, kind: `${item.type}_created`, title: `${item.type[0].toUpperCase()}${item.type.slice(1)} recorded`, detail: item.title, createdAt: item.createdAt.toISOString() })),
    ...decisions.map((item) => ({ id: `decision-${item.id}`, kind: "decision_created", title: "Decision recorded", detail: item.title, createdAt: item.createdAt.toISOString() })),
    ...gates.map((item) => ({ id: `gate-${item.id}`, kind: "capital_evaluated", title: "Capital gate updated", detail: `${item.name} · ${item.status}`, createdAt: item.updatedAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const phase = venture?.stage ? venture.stage : null;
  return NextResponse.json({
    venture,
    phase,
    stats,
    metrics,
    currentSprint,
    trajectory: { assessment: trajectory, executionRisk, validationRisk },
    nextActions,
    activity,
    activitySource: "persisted_domain_records",
    ai: nextActions[0] ? { type: "RECOMMENDATION", title: nextActions[0].title, body: nextActions[0].reason, evidence: nextActions[0].id } : { type: "OBSERVATION", title: "No immediate blocker detected", body: "Add operational evidence to make VELA's recommendations more specific.", evidence: "objectives_signals_sprints" },
  });
}
