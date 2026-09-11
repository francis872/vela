export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
}

export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiff = values.map((value) => (value - avg) ** 2);
  return mean(squaredDiff);
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const position = clamp(p, 0, 100) / 100 * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = position - lowerIndex;
  return sorted[lowerIndex] + weight * (sorted[upperIndex] - sorted[lowerIndex]);
}

export function zScores(values: number[]): number[] {
  if (values.length === 0) return [];

  const avg = mean(values);
  const stdDev = standardDeviation(values);

  if (stdDev === 0) {
    return values.map(() => 0);
  }

  return values.map((value) => (value - avg) / stdDev);
}

export type EvaluationSample = {
  iev: number;
  failureRisk: number;
  createdAt: Date;
};

export function computePortfolioHealthStats(samples: EvaluationSample[]) {
  const ievValues = samples.map((sample) => sample.iev);
  const riskValues = samples.map((sample) => sample.failureRisk);

  const averageFailureRisk = mean(riskValues);
  const highRiskCount = riskValues.filter((risk) => risk >= 60).length;
  const highRiskShare = samples.length > 0 ? (highRiskCount / samples.length) * 100 : 0;

  const ievStdDev = standardDeviation(ievValues);
  const p75FailureRisk = percentile(riskValues, 75);

  const now = Date.now();
  const recentWindowMs = 30 * 24 * 60 * 60 * 1000;
  const recentCount = samples.filter((sample) => now - sample.createdAt.getTime() <= recentWindowMs).length;
  const recentShare = samples.length > 0 ? recentCount / samples.length : 0;

  const sampleSizeScore = Math.min(samples.length / 30, 1) * 60;
  const stabilityScore = (1 - clamp(ievStdDev / 30, 0, 1)) * 25;
  const recencyScore = Math.min(recentShare / 0.4, 1) * 15;

  const confidenceScore = Math.round(clamp(sampleSizeScore + stabilityScore + recencyScore, 0, 100));

  return {
    confidenceScore,
    averageFailureRisk,
    highRiskShare,
    ievStdDev,
    p75FailureRisk,
  };
}
