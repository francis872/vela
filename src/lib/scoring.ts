export type EvaluationInput = {
  monthlyRevenue: number;
  monthlyCosts: number;
  potentialMargin: number;
  digitalization: number;
  replicability: number;
  differentiation: number;
};

type EvaluationScore = {
  iev: number;
  classification: "Scale Candidate" | "Optimization Candidate" | "Sustainability Candidate";
  survivalProbability: number;
  revenueDoubleProb: number;
  expansionProbability: number;
  formalizationProb: number;
  failureRisk: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export function computeScore(input: EvaluationInput): EvaluationScore {
  const marginFromOperations =
    input.monthlyRevenue > 0
      ? clamp(((input.monthlyRevenue - input.monthlyCosts) / input.monthlyRevenue) * 100)
      : 0;

  const weightedScore =
    marginFromOperations * 0.25 +
    clamp(input.potentialMargin) * 0.2 +
    clamp(input.digitalization) * 0.2 +
    clamp(input.replicability) * 0.2 +
    clamp(input.differentiation) * 0.15;

  const iev = Math.round(clamp(weightedScore));

  const classification =
    iev >= 75
      ? "Scale Candidate"
      : iev >= 50
        ? "Optimization Candidate"
        : "Sustainability Candidate";

  const signal = (iev - 50) / 12;
  const survivalProbability = clamp(sigmoid(signal) * 100);
  const revenueDoubleProb = clamp(sigmoid(signal - 0.2) * 100);
  const expansionProbability = clamp(sigmoid((iev - 60) / 10) * 100);
  const formalizationProb = clamp(sigmoid((input.digitalization - 40) / 12) * 100);
  const failureRisk = clamp(100 - survivalProbability * 0.8 - formalizationProb * 0.2);

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
