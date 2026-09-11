export type SignalType = "experiment" | "interview" | "metric" | "insight";

export type CoverageNodeContract = {
  id: string;
  title: string;
  status: string;
  signalCount: number;
  signalTypes: string[];
};

export type CoverageAnalysisContract = {
  blindSpots: string[];
  hubs: string[];
  coverageMap: Record<string, number>;
  coverageRatio: number;
  nextToValidate: string[];
};

export type ValidationCoverageResponse = {
  nodes: CoverageNodeContract[];
  analysis: CoverageAnalysisContract;
  totalSignals: number;
  unlinkedSignals: number;
};

export function normalizeNextToValidate(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export type SprintStatus = "active" | "completed" | "blocked";

export type MetricStatus = "READY" | "INSUFFICIENT_DATA" | "UNAVAILABLE";

export type MetricResult = {
  status: MetricStatus;
  value: number | null;
  label?: string;
  explanation?: string;
  calculatedAt: string;
  sampleSize?: number;
};

export function metricResult(
  value: number | null,
  hasEvidence: boolean,
  options: Omit<MetricResult, "status" | "value" | "calculatedAt"> = {},
): MetricResult {
  return {
    ...options,
    status: hasEvidence && value !== null ? "READY" : "INSUFFICIENT_DATA",
    value: hasEvidence ? value : null,
    calculatedAt: new Date().toISOString(),
  };
}

export type CapitalReadinessResponse = {
  status: "AVAILABLE" | "INSUFFICIENT_DATA";
  readiness: number | null;
  evidence: {
    signals: {
      total: number;
      interviews: number;
      experiments: number;
      metrics: number;
      insights: number;
    };
    objectives: { total: number; completed: number };
    sprints: { total: number; completed: number };
  };
  gates: { total: number; passed: number; failed: number; pending: number };
  missing: { label: string; href: string; reason: string }[];
  explanation: string;
};
