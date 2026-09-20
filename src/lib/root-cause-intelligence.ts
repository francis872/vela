import type { PulseHistoryPoint } from "@/lib/pulse-history";

export type RootCauseMetric = "velocity" | "validation" | "risk" | "readiness" | "sprintCompletion";

export type RootCauseSignal = {
  metric: RootCauseMetric;
  label: string;
  direction: "IMPROVING" | "DETERIORATING";
  delta: number;
  velocityPerDay: number;
  firstMeaningfulChangeAt: string;
  leadHours: number | null;
  impact: number;
};

export type RootCauseAnalysis = {
  status: "AVAILABLE" | "INSUFFICIENT_DATA" | "NO_DOMINANT_CAUSE";
  primary: RootCauseSignal | null;
  contributors: RootCauseSignal[];
  explanation: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

const METRICS: { key: RootCauseMetric; label: string; invert?: boolean }[] = [
  { key: "velocity", label: "Execution Velocity" },
  { key: "validation", label: "Validation Activity" },
  { key: "risk", label: "Risk", invert: true },
  { key: "readiness", label: "Capital Readiness" },
  { key: "sprintCompletion", label: "Sprint Completion" },
];

const MIN_POINTS = 4;
const MIN_METRIC_DELTA = 3;

function normalized(point: PulseHistoryPoint, metric: RootCauseMetric, invert = false) {
  const value = point[metric];
  if (typeof value !== "number") return null;
  return invert ? 100 - value : value;
}

function metricSignal(points: PulseHistoryPoint[], metric: RootCauseMetric, label: string, invert = false): RootCauseSignal | null {
  const available = points
    .map((point) => ({ point, value: normalized(point, metric, invert) }))
    .filter((item): item is { point: PulseHistoryPoint; value: number } => item.value !== null);

  if (available.length < MIN_POINTS) return null;

  const first = available[0];
  const last = available[available.length - 1];
  const delta = last.value - first.value;
  if (Math.abs(delta) < MIN_METRIC_DELTA) return null;

  const elapsedDays = Math.max((new Date(last.point.capturedAt).getTime() - new Date(first.point.capturedAt).getTime()) / 86400000, 0.25);
  const threshold = Math.max(MIN_METRIC_DELTA, Math.abs(delta) * 0.3);
  const change = available.find((item) => Math.abs(item.value - first.value) >= threshold) ?? last;
  const velocityPerDay = delta / elapsedDays;

  return {
    metric,
    label,
    direction: delta < 0 ? "DETERIORATING" : "IMPROVING",
    delta: Math.round(delta * 10) / 10,
    velocityPerDay: Math.round(velocityPerDay * 10) / 10,
    firstMeaningfulChangeAt: change.point.capturedAt,
    leadHours: null,
    impact: Math.round(Math.abs(delta) * 10) / 10,
  };
}

export function analyzeRootCause(points: PulseHistoryPoint[]): RootCauseAnalysis {
  if (points.length < MIN_POINTS) {
    return {
      status: "INSUFFICIENT_DATA",
      primary: null,
      contributors: [],
      explanation: "VELA needs at least four historical snapshots before it can compare which operating variable moved first.",
      confidence: "LOW",
    };
  }

  const signals = METRICS
    .map(({ key, label, invert }) => metricSignal(points, key, label, invert))
    .filter((signal): signal is RootCauseSignal => signal !== null);

  const deteriorating = signals.filter((signal) => signal.direction === "DETERIORATING");
  if (!deteriorating.length) {
    return {
      status: "NO_DOMINANT_CAUSE",
      primary: null,
      contributors: signals.filter((signal) => signal.direction === "IMPROVING"),
      explanation: "No operating metric shows a material deterioration across the observed window.",
      confidence: signals.length >= 3 ? "MEDIUM" : "LOW",
    };
  }

  const ordered = [...deteriorating].sort((a, b) => {
    const time = new Date(a.firstMeaningfulChangeAt).getTime() - new Date(b.firstMeaningfulChangeAt).getTime();
    return time !== 0 ? time : b.impact - a.impact;
  });
  const primary = ordered[0];
  const primaryTime = new Date(primary.firstMeaningfulChangeAt).getTime();
  const withLead = ordered.map((signal) => ({
    ...signal,
    leadHours: Math.round((new Date(signal.firstMeaningfulChangeAt).getTime() - primaryTime) / 3600000),
  }));

  const first = withLead[0];
  const second = withLead[1];
  const confidence = points.length >= 8 && withLead.length >= 2 ? "HIGH" : points.length >= 4 ? "MEDIUM" : "LOW";
  const relation = second
    ? ` It moved ${second.leadHours} hour(s) before the next deteriorating signal, ${second.label}.`
    : "";

  return {
    status: "AVAILABLE",
    primary: first,
    contributors: withLead.slice(1, 4),
    explanation: `${first.label} is the earliest material deterioration detected in the current historical window, changing ${first.delta} points at ${first.velocityPerDay} pts/day.${relation} This is temporal evidence of a likely driver, not proof of causality.`,
    confidence,
  };
}
