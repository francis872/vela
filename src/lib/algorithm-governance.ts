import { prisma } from "@/lib/prisma";
import { DEFAULT_PRIORITY_WEIGHTS } from "@/lib/algorithms/priority-engine";
import type { LearnedAlgorithmParameters } from "@/lib/algorithm-learning";

export const COMPUTATIONAL_FAMILY = "COMPUTATIONAL_INTELLIGENCE";

export const DEFAULT_GOVERNED_PARAMETERS: LearnedAlgorithmParameters = {
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

function asParameters(value: unknown): LearnedAlgorithmParameters {
  return { ...DEFAULT_GOVERNED_PARAMETERS, ...(value as Partial<LearnedAlgorithmParameters> ?? {}) };
}

export async function ensureAlgorithmRegistry(ownerId: string, adaptive: LearnedAlgorithmParameters) {
  const existing = await prisma.algorithmRegistry.findMany({
    where: { ownerId, family: COMPUTATIONAL_FAMILY, status: "active" },
  });
  if (!existing.some((item) => item.role === "champion")) {
    await prisma.algorithmRegistry.upsert({
      where: { ownerId_family_version: { ownerId, family: COMPUTATIONAL_FAMILY, version: "v1-default" } },
      create: {
        ownerId, family: COMPUTATIONAL_FAMILY, version: "v1-default", role: "champion",
        parameters: DEFAULT_GOVERNED_PARAMETERS as unknown as object, activatedAt: new Date(),
      },
      update: { role: "champion", status: "active", retiredAt: null },
    });
  }
  if (adaptive.sampleCount > 0) {
    await prisma.algorithmRegistry.upsert({
      where: { ownerId_family_version: { ownerId, family: COMPUTATIONAL_FAMILY, version: "v2-adaptive" } },
      create: {
        ownerId, family: COMPUTATIONAL_FAMILY, version: "v2-adaptive", role: "challenger",
        parameters: adaptive as unknown as object,
      },
      update: { parameters: adaptive as unknown as object, status: "active" },
    });
  }
}

export async function getGovernedParameters(ownerId: string, adaptive: LearnedAlgorithmParameters) {
  await ensureAlgorithmRegistry(ownerId, adaptive);
  const champion = await prisma.algorithmRegistry.findFirst({
    where: { ownerId, family: COMPUTATIONAL_FAMILY, role: "champion", status: "active" },
    orderBy: { activatedAt: "desc" },
  });
  return {
    version: champion?.version ?? "v1-default",
    parameters: champion ? asParameters(champion.parameters) : DEFAULT_GOVERNED_PARAMETERS,
  };
}

export async function ensureChampionChallengerExperiment(ownerId: string) {
  const [champion, challenger, running] = await Promise.all([
    prisma.algorithmRegistry.findFirst({ where: { ownerId, family: COMPUTATIONAL_FAMILY, role: "champion", status: "active" } }),
    prisma.algorithmRegistry.findFirst({ where: { ownerId, family: COMPUTATIONAL_FAMILY, role: "challenger", status: "active" } }),
    prisma.algorithmExperiment.findFirst({ where: { ownerId, family: COMPUTATIONAL_FAMILY, status: "running" } }),
  ]);
  if (!champion || !challenger || running) return running;
  return prisma.algorithmExperiment.create({
    data: {
      ownerId, family: COMPUTATIONAL_FAMILY,
      championVersion: champion.version, challengerVersion: challenger.version,
    },
  });
}

async function observedScores(ownerId: string) {
  const runs = await prisma.algorithmRun.findMany({
    where: { ownerId, observedAt: { not: null }, outcomeScore: { not: null } },
    orderBy: { observedAt: "desc" },
    take: 40,
    select: { outcomeScore: true, parameters: true },
  });
  const score = runs.length ? runs.reduce((sum, run) => sum + (run.outcomeScore ?? 0), 0) / runs.length : null;
  return { score, samples: runs.length };
}

export async function evaluateGovernance(ownerId: string) {
  const experiment = await ensureChampionChallengerExperiment(ownerId);
  if (!experiment) return { status: "NO_EXPERIMENT" as const };
  const observed = await observedScores(ownerId);
  const challenger = await prisma.algorithmRegistry.findFirst({
    where: { ownerId, family: COMPUTATIONAL_FAMILY, version: experiment.challengerVersion },
  });
  const challengerMetrics = challenger?.metrics as { score?: number; samples?: number } | null;
  const championScore = observed.score;
  const championSamples = observed.samples;
  const challengerScore = challengerMetrics?.score ?? null;
  const challengerSamples = challengerMetrics?.samples ?? 0;

  await prisma.algorithmExperiment.update({
    where: { id: experiment.id },
    data: { championScore, championSamples, challengerScore, challengerSamples },
  });

  if (championSamples < experiment.minimumSamples || challengerSamples < experiment.minimumSamples || championScore === null || challengerScore === null) {
    return { status: "COLLECTING_EVIDENCE" as const, experimentId: experiment.id, championScore, challengerScore, championSamples, challengerSamples };
  }
  if (challengerScore - championScore >= experiment.promotionDelta) {
    return promoteChallenger(ownerId, experiment.id, "challenger exceeded promotion threshold");
  }
  return { status: "HOLD" as const, experimentId: experiment.id, championScore, challengerScore };
}

export async function promoteChallenger(ownerId: string, experimentId: string, reason: string) {
  const experiment = await prisma.algorithmExperiment.findFirst({ where: { id: experimentId, ownerId, status: "running" } });
  if (!experiment) throw new Error("Running experiment not found");
  await prisma.$transaction([
    prisma.algorithmRegistry.updateMany({ where: { ownerId, family: experiment.family, version: experiment.championVersion }, data: { role: "previous", retiredAt: new Date() } }),
    prisma.algorithmRegistry.updateMany({ where: { ownerId, family: experiment.family, version: experiment.challengerVersion }, data: { role: "champion", activatedAt: new Date() } }),
    prisma.algorithmExperiment.update({ where: { id: experiment.id }, data: { status: "promoted", decision: "PROMOTE", decidedAt: new Date() } }),
    prisma.algorithmGovernanceEvent.create({ data: { ownerId, family: experiment.family, action: "PROMOTE", fromVersion: experiment.championVersion, toVersion: experiment.challengerVersion, reason, evidence: { championScore: experiment.championScore, challengerScore: experiment.challengerScore } } }),
  ]);
  return { status: "PROMOTED" as const, from: experiment.championVersion, to: experiment.challengerVersion };
}

export async function rollbackChampion(ownerId: string, reason: string) {
  const [champion, previous] = await Promise.all([
    prisma.algorithmRegistry.findFirst({ where: { ownerId, family: COMPUTATIONAL_FAMILY, role: "champion", status: "active" }, orderBy: { activatedAt: "desc" } }),
    prisma.algorithmRegistry.findFirst({ where: { ownerId, family: COMPUTATIONAL_FAMILY, role: "previous", status: "active" }, orderBy: { retiredAt: "desc" } }),
  ]);
  if (!champion || !previous) return { status: "NO_ROLLBACK_TARGET" as const };
  await prisma.$transaction([
    prisma.algorithmRegistry.update({ where: { id: champion.id }, data: { role: "challenger", retiredAt: new Date() } }),
    prisma.algorithmRegistry.update({ where: { id: previous.id }, data: { role: "champion", activatedAt: new Date(), retiredAt: null } }),
    prisma.algorithmGovernanceEvent.create({ data: { ownerId, family: COMPUTATIONAL_FAMILY, action: "ROLLBACK", fromVersion: champion.version, toVersion: previous.version, reason } }),
  ]);
  return { status: "ROLLED_BACK" as const, from: champion.version, to: previous.version };
}
