import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRIORITY_WEIGHTS, type PriorityWeights } from "@/lib/algorithms/priority-engine";

export type LearnedAlgorithmParameters = {
  priorityWeights: PriorityWeights;
  riskAttenuation: number;
  rbfSigma: number;
  optimizerRiskPenalty: number;
  optimizerCapacityPenalty: number;
  optimizerEvaporation: number;
  optimizerExploration: number;
  learningRate: number;
  sampleCount: number;
};

const DEFAULTS: LearnedAlgorithmParameters = {
  priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
  riskAttenuation: 0.65,
  rbfSigma: 0.35,
  optimizerRiskPenalty: 20,
  optimizerCapacityPenalty: 0.25,
  optimizerEvaporation: 0.88,
  optimizerExploration: 0.18,
  learningRate: 0.08,
  sampleCount: 0,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function normalizeWeights(weights: PriorityWeights): PriorityWeights {
  const bounded = Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, clamp(Number(value) || 0, 0.05, 0.35)]),
  ) as unknown as PriorityWeights;
  const sum = Object.values(bounded).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(bounded).map(([key, value]) => [key, value / sum])) as unknown as PriorityWeights;
}

export async function getAlgorithmParameters(ownerId: string): Promise<LearnedAlgorithmParameters> {
  const profile = await prisma.algorithmProfile.findUnique({ where: { ownerId } });
  if (!profile) return DEFAULTS;
  const raw = profile.priorityWeights as Record<string, number>;
  return {
    priorityWeights: normalizeWeights({ ...DEFAULT_PRIORITY_WEIGHTS, ...raw }),
    riskAttenuation: clamp(profile.riskAttenuation, 0.35, 0.85),
    rbfSigma: clamp(profile.rbfSigma, 0.15, 0.8),
    optimizerRiskPenalty: clamp(profile.optimizerRiskPenalty, 8, 40),
    optimizerCapacityPenalty: clamp(profile.optimizerCapacityPenalty, 0, 2),
    optimizerEvaporation: clamp(profile.optimizerEvaporation, 0.65, 0.97),
    optimizerExploration: clamp(profile.optimizerExploration, 0.05, 0.45),
    learningRate: clamp(profile.learningRate, 0.02, 0.12),
    sampleCount: profile.sampleCount,
  };
}

export function algorithmSignature(input: { objectiveIds: string[]; selected: string[]; topId?: string | null }) {
  return createHash("sha256")
    .update(JSON.stringify({
      objectives: [...input.objectiveIds].sort(),
      selected: [...input.selected].sort(),
      topId: input.topId ?? null,
      bucket: Math.floor(Date.now() / (6 * 60 * 60 * 1000)),
    }))
    .digest("hex");
}

export async function recordAlgorithmRun(input: {
  ownerId: string;
  signature: string;
  recommendations: unknown;
  parameters: LearnedAlgorithmParameters;
  context: unknown;
}) {
  return prisma.algorithmRun.upsert({
    where: { ownerId_signature: { ownerId: input.ownerId, signature: input.signature } },
    create: {
      ownerId: input.ownerId,
      signature: input.signature,
      algorithmSet: "VELA_COMPUTATIONAL_INTELLIGENCE_V1",
      recommendations: input.recommendations as object,
      parameters: input.parameters as unknown as object,
      context: input.context as object,
    },
    update: {},
  });
}

type StoredRecommendation = {
  topId?: string | null;
  selected?: string[];
  factors?: Record<string, number>;
};

export async function learnFromAlgorithmOutcomes(ownerId: string) {
  const runs = await prisma.algorithmRun.findMany({
    where: { ownerId, observedAt: null, createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  if (!runs.length) return { learned: false, samples: 0 };

  let parameters = await getAlgorithmParameters(ownerId);
  let learnedSamples = 0;

  for (const run of runs) {
    const recommendation = run.recommendations as unknown as StoredRecommendation;
    const selected = recommendation.selected ?? [];
    const ids = [...new Set([...(selected ?? []), ...(recommendation.topId ? [recommendation.topId] : [])])];
    if (!ids.length) {
      await prisma.algorithmRun.update({ where: { id: run.id }, data: { observedAt: new Date(), outcomeScore: 0, outcome: { reason: "no_recommended_objectives" } } });
      continue;
    }

    const objectives = await prisma.objective.findMany({
      where: { ownerId, id: { in: ids } },
      select: { id: true, status: true, updatedAt: true },
    });
    if (!objectives.length) continue;

    const completed = objectives.filter((objective) => objective.status === "completed").length;
    const blocked = objectives.filter((objective) => objective.status === "blocked").length;
    const atRisk = objectives.filter((objective) => objective.status === "at_risk").length;
    const outcomeScore = clamp((completed - blocked * 0.75 - atRisk * 0.25) / objectives.length, -1, 1);
    const lr = parameters.learningRate;
    const direction = outcomeScore;

    const factors = recommendation.factors ?? {};
    const nextWeights = { ...parameters.priorityWeights };
    for (const key of Object.keys(nextWeights) as (keyof PriorityWeights)[]) {
      const exposure = clamp(factors[key] ?? 0, 0, 1);
      nextWeights[key] = nextWeights[key] * (1 + lr * direction * exposure);
    }
    parameters = {
      ...parameters,
      priorityWeights: normalizeWeights(nextWeights),
      optimizerRiskPenalty: clamp(parameters.optimizerRiskPenalty * (1 + lr * (-direction) * 0.2), 8, 40),
      optimizerExploration: clamp(parameters.optimizerExploration + lr * (-direction) * 0.05, 0.05, 0.45),
      sampleCount: parameters.sampleCount + 1,
    };

    await prisma.algorithmRun.update({
      where: { id: run.id },
      data: {
        observedAt: new Date(),
        outcomeScore,
        outcome: { completed, blocked, atRisk, observed: objectives.length },
      },
    });
    learnedSamples += 1;
  }

  if (learnedSamples) {
    await prisma.algorithmProfile.upsert({
      where: { ownerId },
      create: {
        ownerId,
        priorityWeights: parameters.priorityWeights,
        riskAttenuation: parameters.riskAttenuation,
        rbfSigma: parameters.rbfSigma,
        optimizerRiskPenalty: parameters.optimizerRiskPenalty,
        optimizerCapacityPenalty: parameters.optimizerCapacityPenalty,
        optimizerEvaporation: parameters.optimizerEvaporation,
        optimizerExploration: parameters.optimizerExploration,
        learningRate: parameters.learningRate,
        sampleCount: parameters.sampleCount,
        lastLearnedAt: new Date(),
      },
      update: {
        priorityWeights: parameters.priorityWeights,
        optimizerRiskPenalty: parameters.optimizerRiskPenalty,
        optimizerExploration: parameters.optimizerExploration,
        sampleCount: parameters.sampleCount,
        lastLearnedAt: new Date(),
      },
    });
  }
  return { learned: learnedSamples > 0, samples: learnedSamples, parameters };
}
