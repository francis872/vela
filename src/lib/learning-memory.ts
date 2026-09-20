import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";

function signature(targetMetric: string, source: string, evidence: string[]) {
  const normalizedEvidence = evidence
    .map((item) => item.split(":")[0].trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .slice(0, 5);
  return [source.toLowerCase(), targetMetric.toLowerCase(), ...normalizedEvidence].join("|");
}

function effectiveness(status: string | null, delta: number | null, targetMetric: string, targetDelta: number | null) {
  if (!status) return 0;
  const direction = targetMetric.toLowerCase().includes("risk") ? -1 : 1;
  const improvement = (delta ?? 0) * direction;
  const target = Math.max(1, Math.abs(targetDelta ?? 10));
  const ratio = Math.max(-1, Math.min(1.5, improvement / target));
  const statusWeight = status === "SUCCESS" ? 1 : status === "PARTIAL" ? 0.6 : status === "NO_IMPROVEMENT" ? 0 : 0.25;
  return Math.round(((ratio * 0.7) + (statusWeight * 0.3)) * 100) / 100;
}

export async function consolidateLearningMemory(ownerId: string) {
  const completed = await prisma.intervention.findMany({
    where: { ownerId, status: "completed", outcomeStatus: { in: ["SUCCESS", "PARTIAL", "NO_IMPROVEMENT"] } },
    orderBy: { completedAt: "asc" },
  });

  for (const item of completed) {
    const score = effectiveness(item.outcomeStatus, item.outcomeDelta, item.targetMetric, item.targetDelta);
    const problemSignature = signature(item.targetMetric, item.source, item.sourceEvidence);
    const confidence = item.outcomeStatus === "SUCCESS" && Math.abs(item.outcomeDelta ?? 0) >= Math.abs(item.targetDelta ?? 10)
      ? "HIGH"
      : item.outcomeStatus === "PARTIAL" ? "MEDIUM" : "LOW";
    const lesson = item.outcomeStatus === "SUCCESS"
      ? `“${item.actionTitle}” was associated with a successful ${item.targetMetric} recovery of ${item.outcomeDelta ?? 0} points.`
      : item.outcomeStatus === "PARTIAL"
        ? `“${item.actionTitle}” produced partial movement in ${item.targetMetric} (${item.outcomeDelta ?? 0} points) but did not fully reach the target.`
        : `“${item.actionTitle}” did not materially improve ${item.targetMetric} within the intervention window.`;

    const existingLearning = await prisma.interventionLearning.findUnique({ where: { interventionId: item.id }, select: { id: true } });
    const learning = await prisma.interventionLearning.upsert({
      where: { interventionId: item.id },
      create: {
        ownerId,
        interventionId: item.id,
        problemSignature,
        targetMetric: item.targetMetric,
        actionTitle: item.actionTitle,
        source: item.source,
        outcomeStatus: item.outcomeStatus ?? "UNKNOWN",
        outcomeDelta: item.outcomeDelta,
        effectiveness: score,
        confidence,
        lesson,
        evidence: item.sourceEvidence,
      },
      update: {
        outcomeStatus: item.outcomeStatus ?? "UNKNOWN",
        outcomeDelta: item.outcomeDelta,
        effectiveness: score,
        confidence,
        lesson,
        evidence: item.sourceEvidence,
      },
    });
    if (!existingLearning) {
      await dispatchDomainEvent("learning_created", {
        learningId: learning.id,
        interventionId: item.id,
        ownerId,
        outcomeStatus: learning.outcomeStatus,
      });
    }
  }
}

export async function recallLearning(ownerId: string, input: {
  targetMetric: string;
  source: string;
  evidence: string[];
}) {
  const exactSignature = signature(input.targetMetric, input.source, input.evidence);
  const memories = await prisma.interventionLearning.findMany({
    where: {
      ownerId,
      OR: [
        { problemSignature: exactSignature },
        { targetMetric: input.targetMetric },
      ],
    },
    orderBy: [{ effectiveness: "desc" }, { learnedAt: "desc" }],
    take: 12,
  });

  if (!memories.length) {
    return {
      status: "INSUFFICIENT_DATA" as const,
      recommendation: null,
      avoidedAction: null,
      memories: [],
      explanation: "VELA has not completed enough comparable interventions to reuse a learned response yet.",
    };
  }

  const successful = memories.filter((item) => item.outcomeStatus === "SUCCESS" || item.outcomeStatus === "PARTIAL");
  const failed = memories.filter((item) => item.outcomeStatus === "NO_IMPROVEMENT");
  const recommendation = successful[0] ?? null;
  const avoidedAction = failed[0] ?? null;

  return {
    status: "AVAILABLE" as const,
    recommendation,
    avoidedAction,
    memories,
    explanation: recommendation
      ? `VELA found ${memories.length} comparable learning record(s). The strongest prior response is “${recommendation.actionTitle}” with effectiveness ${recommendation.effectiveness}.`
      : `VELA found ${memories.length} comparable intervention(s), but none has produced a positive outcome yet.`,
  };
}
