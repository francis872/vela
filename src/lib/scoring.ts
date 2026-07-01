type ScoreInput = {
  monthlyRevenue: number;
  monthlyCosts: number;
  potentialMargin: number;
  digitalization: number;
  replicability: number;
  differentiation: number;
  companyStage?: string;
  teamSize?: number;
  yearsOperating?: number;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const stageBoost: Record<string, number> = {
  idea: -8,
  validation: -2,
  mvp: 2,
  early_traction: 8,
  growth: 12,
  scale: 16,
  mature: 10,
  turnaround: -6,
};

export function computeScore(input: ScoreInput) {
  const baseMargin = input.monthlyRevenue > 0
    ? ((input.monthlyRevenue - input.monthlyCosts) / input.monthlyRevenue) * 100
    : 0;

  const weighted =
    input.potentialMargin * 0.22 +
    input.digitalization * 0.22 +
    input.replicability * 0.28 +
    input.differentiation * 0.28;

  const stageFactor = stageBoost[input.companyStage || "validation"] ?? 0;
  const teamFactor = clamp((input.teamSize ?? 1) * 1.2, 0, 12);
  const trajectoryFactor = clamp((input.yearsOperating ?? 0) * 1.6, 0, 12);

  const iev = Math.round(clamp(weighted * 0.8 + clamp(baseMargin) * 0.2 + stageFactor + teamFactor + trajectoryFactor));

  let classification = "Sustainability Candidate";

  if (iev >= 75) {
    classification = "Scale Candidate";
  } else if (iev >= 50) {
    classification = "Optimization Candidate";
  }

  const survivalProbability = clamp(iev + 10);
  const revenueDoubleProb = clamp(iev * 0.9);
  const expansionProbability = clamp(iev * 0.82);
  const formalizationProb = clamp(iev * 0.88);
  const failureRisk = clamp(100 - iev);

  return {
    iev,
    classification,
    survivalProbability,
    revenueDoubleProb,
    expansionProbability,
    formalizationProb,
    failureRisk,
  };
}