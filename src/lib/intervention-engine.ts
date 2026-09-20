import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";

export type InterventionProposal = {
  title: string;
  hypothesis: string;
  source: string;
  sourceEvidence: string[];
  targetMetric: string;
  baselineValue: number | null;
  targetDelta: number;
  deadlineDays: number;
  actionTitle: string;
  actionHref: string;
};

type MetricMap = {
  velocity: number | null;
  validation: number | null;
  risk: number | null;
  readiness: number | null;
  sprintCompletion: number | null;
};

function metricValue(targetMetric: string, metrics: MetricMap) {
  const key = targetMetric.toLowerCase();
  if (key.includes("validation") || key.includes("pmf")) return metrics.validation;
  if (key.includes("velocity") || key.includes("execution")) return metrics.velocity;
  if (key.includes("risk")) return metrics.risk;
  if (key.includes("readiness") || key.includes("capital")) return metrics.readiness;
  if (key.includes("sprint")) return metrics.sprintCompletion;
  return null;
}

export function proposeIntervention(input: {
  command: { title: string; explanation: string; affectedMetric: string; action: { title: string; href: string }; evidence: string[] };
  rootCause: { status: string; primary: { label: string; delta: number } | null };
  metrics: MetricMap;
  learnedAction?: { actionTitle: string; effectiveness: number; confidence: string } | null;
}): InterventionProposal {
  const rootMetric = input.rootCause.primary?.label ?? input.command.affectedMetric;
  const baseline = metricValue(rootMetric, input.metrics);
  const targetDelta = rootMetric.toLowerCase().includes("risk") ? -10 : 10;

  const actionTitle = input.learnedAction?.actionTitle ?? input.command.action.title;
  const learnedContext = input.learnedAction
    ? ` VELA previously observed effectiveness ${input.learnedAction.effectiveness} with confidence ${input.learnedAction.confidence} for this response.`
    : "";

  return {
    title: input.rootCause.primary ? `Recover ${rootMetric}` : input.command.title,
    hypothesis: input.rootCause.primary
      ? `If the venture executes “${actionTitle}”, the earliest deteriorating signal (${rootMetric}) should improve before downstream metrics recover.${learnedContext}`
      : `If the venture executes “${actionTitle}”, ${input.command.affectedMetric} should materially improve in the next operating window.${learnedContext}`,
    source: input.rootCause.primary ? "root_cause_intelligence" : "command_center",
    sourceEvidence: input.command.evidence,
    targetMetric: rootMetric,
    baselineValue: baseline,
    targetDelta,
    deadlineDays: 7,
    actionTitle,
    actionHref: input.command.action.href,
  };
}

export async function listInterventions(ownerId: string) {
  return prisma.intervention.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}

export async function createIntervention(ownerId: string, proposal: InterventionProposal) {
  const deadline = new Date(Date.now() + proposal.deadlineDays * 86400000);
  return prisma.intervention.create({
    data: {
      ownerId,
      title: proposal.title,
      hypothesis: proposal.hypothesis,
      source: proposal.source,
      sourceEvidence: proposal.sourceEvidence,
      targetMetric: proposal.targetMetric,
      baselineValue: proposal.baselineValue,
      targetDelta: proposal.targetDelta,
      deadline,
      actionTitle: proposal.actionTitle,
      actionHref: proposal.actionHref,
      status: "accepted",
      acceptedAt: new Date(),
      startedAt: new Date(),
    },
  });
}

export async function updateInterventionOutcomes(ownerId: string, metrics: MetricMap) {
  const active = await prisma.intervention.findMany({
    where: { ownerId, status: { in: ["accepted", "active"] } },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  for (const intervention of active) {
    const current = metricValue(intervention.targetMetric, metrics);
    if (current === null || intervention.baselineValue === null) continue;

    const rawDelta = current - intervention.baselineValue;
    const improvement = intervention.targetMetric.toLowerCase().includes("risk") ? -rawDelta : rawDelta;
    const target = Math.abs(intervention.targetDelta ?? 10);
    const expired = intervention.deadline ? intervention.deadline.getTime() <= now.getTime() : false;
    const achieved = improvement >= target;

    const wasCompleted = intervention.status === "completed";
    const updated = await prisma.intervention.update({
      where: { id: intervention.id },
      data: achieved ? {
        status: "completed",
        completedAt: now,
        outcomeValue: current,
        outcomeDelta: rawDelta,
        outcomeStatus: "SUCCESS",
        outcomeSummary: `${intervention.targetMetric} changed ${Math.round(rawDelta * 10) / 10} points from baseline and reached the intervention target.`,
      } : expired ? {
        status: "completed",
        completedAt: now,
        outcomeValue: current,
        outcomeDelta: rawDelta,
        outcomeStatus: improvement > 0 ? "PARTIAL" : "NO_IMPROVEMENT",
        outcomeSummary: `${intervention.targetMetric} changed ${Math.round(rawDelta * 10) / 10} points by the intervention deadline.`,
      } : {
        status: "active",
        outcomeValue: current,
        outcomeDelta: rawDelta,
        outcomeStatus: "MEASURING",
        outcomeSummary: `${intervention.targetMetric} has changed ${Math.round(rawDelta * 10) / 10} points while VELA continues measuring the intervention.`,
      },
    });
    if (!wasCompleted && updated.status === "completed") {
      await dispatchDomainEvent("intervention_completed", {
        interventionId: updated.id,
        ownerId,
        outcomeStatus: updated.outcomeStatus,
      });
    }
  }
}
