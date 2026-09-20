import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2);
}

function decisionSignature(input: { title: string; context: string; choice: string; evidence: string[] }) {
  const tokens = [...normalize(input.title), ...normalize(input.context), ...normalize(input.choice), ...input.evidence.flatMap(normalize)];
  return [...new Set(tokens)].sort().slice(0, 12).join("|");
}

function effectiveness(status: string) {
  return status === "SUCCESS" ? 1 : status === "PARTIAL" ? 0.55 : status === "NO_IMPROVEMENT" ? 0 : 0.25;
}

export async function consolidateDecisionLearning(ownerId: string) {
  const decisions = await prisma.decision.findMany({
    where: {
      ownerId,
      outcome: { not: null },
      outcomeStatus: { in: ["SUCCESS", "PARTIAL", "NO_IMPROVEMENT"] },
      learnedAt: { not: null },
    },
    orderBy: { learnedAt: "asc" },
  });

  for (const decision of decisions) {
    if (!decision.outcome || !decision.outcomeStatus) continue;
    const signature = decisionSignature(decision);
    const score = effectiveness(decision.outcomeStatus);
    const confidence = decision.evidence.length >= 2 && decision.expectedOutcome
      ? decision.outcomeStatus === "SUCCESS" ? "HIGH" : "MEDIUM"
      : "LOW";
    const lesson = decision.outcomeStatus === "SUCCESS"
      ? `The decision “${decision.title}” was associated with the expected positive outcome. Reuse the reasoning only when the operating context and evidence are comparable.`
      : decision.outcomeStatus === "PARTIAL"
        ? `The decision “${decision.title}” produced a partial outcome. Reuse cautiously and revisit the assumptions that did not fully hold.`
        : `The decision “${decision.title}” did not produce the intended improvement. Avoid repeating the same choice without materially different evidence or context.`;

    const existing = await prisma.decisionLearning.findUnique({ where: { decisionId: decision.id }, select: { id: true } });
    const memory = await prisma.decisionLearning.upsert({
      where: { decisionId: decision.id },
      create: {
        ownerId,
        decisionId: decision.id,
        signature,
        decisionTitle: decision.title,
        choice: decision.choice,
        expectedOutcome: decision.expectedOutcome,
        outcome: decision.outcome,
        outcomeStatus: decision.outcomeStatus,
        effectiveness: score,
        confidence,
        lesson,
        evidence: decision.evidence,
      },
      update: {
        signature,
        expectedOutcome: decision.expectedOutcome,
        outcome: decision.outcome,
        outcomeStatus: decision.outcomeStatus,
        effectiveness: score,
        confidence,
        lesson,
        evidence: decision.evidence,
      },
    });

    if (!existing) {
      await dispatchDomainEvent("decision_memory_created", {
        learningId: memory.id,
        decisionId: decision.id,
        ownerId,
        outcomeStatus: memory.outcomeStatus,
      });
    }
  }
}

export async function recallDecisionLearning(ownerId: string, context: { evidence: string[]; focus: string; commandTitle: string }) {
  const queryTokens = new Set([
    ...normalize(context.focus),
    ...normalize(context.commandTitle),
    ...context.evidence.flatMap(normalize),
  ]);
  const memories = await prisma.decisionLearning.findMany({
    where: { ownerId },
    orderBy: [{ learnedAt: "desc" }],
    take: 40,
  });

  const ranked = memories.map((memory) => {
    const memoryTokens = new Set(memory.signature.split("|").filter(Boolean));
    const overlap = [...queryTokens].filter((token) => memoryTokens.has(token)).length;
    return { memory, overlap };
  }).filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.memory.effectiveness - a.memory.effectiveness);

  const comparable = ranked.slice(0, 8).map((item) => item.memory);
  const successful = comparable.find((item) => item.outcomeStatus === "SUCCESS" || item.outcomeStatus === "PARTIAL") ?? null;
  const failed = comparable.find((item) => item.outcomeStatus === "NO_IMPROVEMENT") ?? null;

  if (!comparable.length) {
    return {
      status: "INSUFFICIENT_DATA" as const,
      recommendation: null,
      avoidedDecision: null,
      memories: [],
      explanation: "VELA has decision memories, but none is sufficiently comparable to the current operating context.",
    };
  }

  return {
    status: "AVAILABLE" as const,
    recommendation: successful,
    avoidedDecision: failed,
    memories: comparable,
    explanation: successful
      ? `VELA found ${comparable.length} comparable decision memory record(s). “${successful.decisionTitle}” previously produced a ${successful.outcomeStatus.toLowerCase()} outcome in a related context.`
      : `VELA found ${comparable.length} comparable decision memory record(s), but none has produced a positive outcome yet.`,
  };
}
