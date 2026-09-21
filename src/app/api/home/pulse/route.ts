import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { collectVentureStats } from "@/lib/venture-metrics";
import { assessExecutionRisk, assessTrajectory, assessValidationGap } from "@/lib/predictions";
import { metricResult, type MetricResult } from "@/lib/functional-contracts";
import { synthesizeHomeIntelligence } from "@/lib/home-intelligence";
import { capturePulseSnapshot, getPulseTrend } from "@/lib/pulse-history";
import { analyzeRootCause } from "@/lib/root-cause-intelligence";
import { listInterventions, proposeIntervention, updateInterventionOutcomes } from "@/lib/intervention-engine";
import { consolidateLearningMemory, recallLearning } from "@/lib/learning-memory";
import { consolidateDecisionLearning, recallDecisionLearning } from "@/lib/decision-learning-memory";
import { computeVelaAlgorithms } from "@/lib/computational-intelligence";

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

  const velocityValue = typeof metrics.velocity.value === "number" ? metrics.velocity.value : null;
  const validationValue = typeof metrics.validation.value === "number" ? metrics.validation.value : null;

  const blockedObjective = objectives.find((item) => item.status === "blocked");
  const atRiskObjective = objectives.find((item) => item.status === "at_risk");

  const command = blockedObjective
    ? {
        status: "ATTENTION",
        priority: "HIGH",
        title: "A blocked objective is stopping execution",
        explanation: `Resolve “${blockedObjective.title}” before increasing execution load. VELA found a persisted objective marked as blocked.`,
        action: { title: "Resolve objective", href: "/build" },
        evidence: [`objective:${blockedObjective.id}`, "objective_status:blocked"],
        affectedMetric: "Operational Health",
      }
    : stats.signals.interviews === 0
      ? {
          status: "ATTENTION",
          priority: "HIGH",
          title: "Customer validation needs attention",
          explanation: velocityValue !== null && velocityValue >= 60
            ? `Execution Velocity is ${velocityValue}, but there are no customer interview signals. Validate before accelerating build activity.`
            : "There are no customer interview signals yet. Capture direct customer evidence before making the next major product decision.",
          action: { title: "Record customer interview", href: "/validate" },
          evidence: ["customer_interviews:0", velocityValue !== null ? `execution_velocity:${velocityValue}` : "execution_velocity:insufficient_data"],
          affectedMetric: "PMF Evidence",
        }
      : velocityValue !== null && validationValue !== null && velocityValue - validationValue >= 20
        ? {
            status: "ATTENTION",
            priority: "HIGH",
            title: "Execution is outpacing validation",
            explanation: `Execution Velocity is ${velocityValue} while Validation Activity is ${validationValue}. Gather new market evidence before increasing delivery speed.`,
            action: { title: "Strengthen validation", href: "/validate" },
            evidence: [`execution_velocity:${velocityValue}`, `validation_activity:${validationValue}`],
            affectedMetric: "Validation Activity",
          }
        : executionRisk.status === "AVAILABLE" && executionRisk.level === "HIGH"
          ? {
              status: "ATTENTION",
              priority: "HIGH",
              title: "Execution risk requires intervention",
              explanation: executionRisk.factors[0] ?? "VELA detected elevated execution risk from current operating evidence.",
              action: { title: "Review execution", href: "/engine" },
              evidence: executionRisk.factors.length ? executionRisk.factors : ["execution_risk:high"],
              affectedMetric: "Risk",
            }
          : atRiskObjective
            ? {
                status: "FOCUS",
                priority: "MEDIUM",
                title: "An objective is at risk",
                explanation: `“${atRiskObjective.title}” is marked at risk. Review its constraints and next commitment before the current cycle advances.`,
                action: { title: "Review objective", href: "/build" },
                evidence: [`objective:${atRiskObjective.id}`, "objective_status:at_risk"],
                affectedMetric: "Operational Health",
              }
            : stats.sprints.total === 0
              ? {
                  status: "FOCUS",
                  priority: "MEDIUM",
                  title: "Establish an execution cadence",
                  explanation: "No Sprint evidence exists yet. Create the first Sprint so VELA can measure throughput, commitments and execution velocity.",
                  action: { title: "Create first Sprint", href: "/engine" },
                  evidence: ["sprints:0"],
                  affectedMetric: "Execution Velocity",
                }
              : stats.gates.total === 0
                ? {
                    status: "FOCUS",
                    priority: "MEDIUM",
                    title: "Capital readiness lacks decision gates",
                    explanation: "Execution data exists, but no capital gates are defined. Add gates so readiness can reflect explicit investment criteria.",
                    action: { title: "Define capital gates", href: "/capital" },
                    evidence: ["capital_gates:0"],
                    affectedMetric: "Capital Readiness",
                  }
                : {
                    status: "STABLE",
                    priority: "LOW",
                    title: "Operating rhythm is stable",
                    explanation: "No immediate blocker is dominant in the current evidence. Continue the active Sprint and keep validation signals fresh.",
                    action: { title: "Review operating plan", href: "/engine" },
                    evidence: ["objectives", "signals", "sprints", "capital_gates"],
                    affectedMetric: "Venture Pulse",
                  };

  const sprintCompletion = currentSprint && currentSprint.items.length > 0
    ? Math.round((currentSprint.items.filter((item) => item.done).length / currentSprint.items.length) * 100)
    : null;

  await capturePulseSnapshot({
    ownerId,
    velocity: velocityValue,
    validation: validationValue,
    risk: typeof metrics.risk.value === "number" ? metrics.risk.value : null,
    readiness: typeof metrics.readiness.value === "number" ? metrics.readiness.value : null,
    sprintCompletion,
    trajectoryStatus: trajectory.status,
    commandStatus: command.status,
    commandPriority: command.priority,
  });
  const history = await getPulseTrend(ownerId);
  const rootCause = analyzeRootCause(history.points);
  const interventionMetrics = {
    velocity: velocityValue,
    validation: validationValue,
    risk: typeof metrics.risk.value === "number" ? metrics.risk.value : null,
    readiness: typeof metrics.readiness.value === "number" ? metrics.readiness.value : null,
    sprintCompletion,
  };
  await updateInterventionOutcomes(ownerId, interventionMetrics);
  await consolidateLearningMemory(ownerId);
  await consolidateDecisionLearning(ownerId);
  const interventions = await listInterventions(ownerId);
  const baseInterventionProposal = proposeIntervention({ command, rootCause, metrics: interventionMetrics });
  const learningMemory = await recallLearning(ownerId, {
    targetMetric: baseInterventionProposal.targetMetric,
    source: baseInterventionProposal.source,
    evidence: baseInterventionProposal.sourceEvidence,
  });
  const interventionProposal = proposeIntervention({
    command,
    rootCause,
    metrics: interventionMetrics,
    learnedAction: learningMemory.recommendation ? {
      actionTitle: learningMemory.recommendation.actionTitle,
      effectiveness: learningMemory.recommendation.effectiveness,
      confidence: learningMemory.recommendation.confidence,
    } : null,
  });

  const decisionMemory = await recallDecisionLearning(ownerId, {
    evidence: command.evidence,
    focus: command.affectedMetric,
    commandTitle: command.title,
  });

  const algorithms = await computeVelaAlgorithms(ownerId);
  const algorithmicContext = {
    topPriority: algorithms.priority.top ? {
      id: algorithms.priority.top.id,
      title: algorithms.priority.top.title,
      score: algorithms.priority.top.score,
      executable: algorithms.priority.top.executable,
      reasons: algorithms.priority.top.reasons,
    } : null,
    systemicRisk: algorithms.risk.topSystemicRisks[0] ?? null,
    historicalAnalogue: algorithms.similarity.closest,
    executionPlan: {
      selected: algorithms.optimization.selectedObjectives,
      deferred: algorithms.optimization.deferredObjectives,
      capacity: algorithms.optimization.capacity,
      score: algorithms.optimization.plan.score,
    },
  };

  const ai = synthesizeHomeIntelligence({
    command,
    metrics: {
      velocity: velocityValue,
      validation: validationValue,
      risk: typeof metrics.risk.value === "number" ? metrics.risk.value : null,
      readiness: typeof metrics.readiness.value === "number" ? metrics.readiness.value : null,
    },
    sprint: currentSprint ? {
      status: currentSprint.status,
      totalItems: currentSprint.items.length,
      completedItems: currentSprint.items.filter((item) => item.done).length,
    } : null,
    executionRisk,
    validationRisk,
    trajectory,
    history,
    rootCause,
    decisionMemory,
    algorithms: algorithmicContext,
  });

  const phase = venture?.stage ? venture.stage : null;
  return NextResponse.json({
    venture,
    phase,
    stats,
    metrics,
    command,
    currentSprint,
    trajectory: { assessment: trajectory, executionRisk, validationRisk, history, rootCause },
    nextActions,
    interventions,
    interventionProposal,
    learningMemory,
    decisionMemory,
    algorithms: algorithmicContext,
    activity,
    activitySource: "persisted_domain_records",
    ai,
  });
}
