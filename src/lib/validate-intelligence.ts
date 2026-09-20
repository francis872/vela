import { analyzeCoverage, type CoverageNode } from "@/lib/graph";

export type ValidateObjectiveInput = CoverageNode & {
  priority: number;
};

export type ValidateSignalInput = {
  id: string;
  type: "experiment" | "interview" | "metric" | "insight";
  objectiveId: string | null;
  createdAt: Date;
};

export type ValidateIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  focusObjectiveId: string | null;
  focusObjectiveTitle: string | null;
  suggestedSignalType: "experiment" | "interview" | "metric" | "insight";
  actionLabel: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  coverage: {
    ratio: number;
    blindSpots: { id: string; title: string; priority: number }[];
    nextToValidate: string | null;
  };
  signalMix: {
    experiment: number;
    interview: number;
    metric: number;
    insight: number;
    diversity: number;
    unlinked: number;
  };
};

function confidence(objectives: ValidateObjectiveInput[], signals: ValidateSignalInput[]) {
  if (!objectives.length && !signals.length) return "LOW" as const;
  if (objectives.length >= 2 && signals.length >= 3) return "HIGH" as const;
  return "MEDIUM" as const;
}

export function synthesizeValidateIntelligence(input: {
  objectives: ValidateObjectiveInput[];
  signals: ValidateSignalInput[];
}): ValidateIntelligence {
  const coverage = analyzeCoverage(input.objectives);
  const byId = new Map(input.objectives.map((objective) => [objective.id, objective]));
  const counts = {
    experiment: input.signals.filter((signal) => signal.type === "experiment").length,
    interview: input.signals.filter((signal) => signal.type === "interview").length,
    metric: input.signals.filter((signal) => signal.type === "metric").length,
    insight: input.signals.filter((signal) => signal.type === "insight").length,
  };
  const diversity = Object.values(counts).filter((count) => count > 0).length;
  const unlinked = input.signals.filter((signal) => !signal.objectiveId).length;
  const blindSpots = coverage.blindSpots
    .map((id) => byId.get(id))
    .filter((objective): objective is ValidateObjectiveInput => Boolean(objective))
    .sort((a, b) => a.priority - b.priority)
    .map((objective) => ({ id: objective.id, title: objective.title, priority: objective.priority }));

  const evidence = [
    `objectives:${input.objectives.length}`,
    `signals:${input.signals.length}`,
    `coverage:${Math.round(coverage.coverageRatio * 100)}`,
    `signal_diversity:${diversity}`,
    `unlinked_signals:${unlinked}`,
  ];
  const level = confidence(input.objectives, input.signals);

  if (!input.objectives.length) {
    return {
      status: "SETUP",
      title: "Validation needs an execution target.",
      explanation: "Create at least one Build objective so new evidence can test a specific assumption or outcome.",
      focusObjectiveId: null,
      focusObjectiveTitle: null,
      suggestedSignalType: "interview",
      actionLabel: "Create first validation signal",
      confidence: "LOW",
      evidence,
      coverage: { ratio: 0, blindSpots: [], nextToValidate: null },
      signalMix: { ...counts, diversity, unlinked },
    };
  }

  const blind = blindSpots[0];
  if (blind) {
    const suggestedSignalType = counts.interview === 0 ? "interview" : counts.metric === 0 ? "metric" : "experiment";
    return {
      status: "ATTENTION",
      title: "A Build objective has no validation evidence.",
      explanation: `“${blind.title}” is currently a blind spot. Attach direct evidence before increasing execution commitment.`,
      focusObjectiveId: blind.id,
      focusObjectiveTitle: blind.title,
      suggestedSignalType,
      actionLabel: "Validate blind spot",
      confidence: level,
      evidence: [...evidence, `blind_spots:${blindSpots.length}`],
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      signalMix: { ...counts, diversity, unlinked },
    };
  }

  if (counts.interview === 0) {
    return {
      status: "FOCUS",
      title: "Validation lacks direct customer evidence.",
      explanation: "Signals exist, but none come from customer interviews. Add qualitative evidence before relying only on internal or quantitative signals.",
      focusObjectiveId: coverage.nextToValidate,
      focusObjectiveTitle: coverage.nextToValidate ? byId.get(coverage.nextToValidate)?.title ?? null : null,
      suggestedSignalType: "interview",
      actionLabel: "Record customer interview",
      confidence: level,
      evidence: [...evidence, "interviews:0"],
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      signalMix: { ...counts, diversity, unlinked },
    };
  }

  if (counts.metric === 0) {
    return {
      status: "FOCUS",
      title: "Validation lacks quantitative evidence.",
      explanation: "Customer evidence exists, but no metric has been linked yet. Add a measurable signal so qualitative learning can be compared against observed behavior.",
      focusObjectiveId: coverage.nextToValidate,
      focusObjectiveTitle: coverage.nextToValidate ? byId.get(coverage.nextToValidate)?.title ?? null : null,
      suggestedSignalType: "metric",
      actionLabel: "Record validation metric",
      confidence: level,
      evidence: [...evidence, "metrics:0"],
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      signalMix: { ...counts, diversity, unlinked },
    };
  }

  if (unlinked > Math.max(2, Math.floor(input.signals.length * 0.3))) {
    return {
      status: "FOCUS",
      title: "Too much evidence is disconnected from execution.",
      explanation: `${unlinked} signal(s) are not linked to a Build objective. Connect evidence to explicit objectives so VELA can measure coverage and learning quality.`,
      focusObjectiveId: null,
      focusObjectiveTitle: null,
      suggestedSignalType: "insight",
      actionLabel: "Review unlinked evidence",
      confidence: level,
      evidence: [...evidence, `unlinked_ratio:${Math.round((unlinked / Math.max(1, input.signals.length)) * 100)}`],
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      signalMix: { ...counts, diversity, unlinked },
    };
  }

  return {
    status: "STABLE",
    title: "Validation coverage is structurally healthy.",
    explanation: "Every active objective has linked evidence and the current signal mix includes both direct customer and quantitative evidence.",
    focusObjectiveId: coverage.nextToValidate,
    focusObjectiveTitle: coverage.nextToValidate ? byId.get(coverage.nextToValidate)?.title ?? null : null,
    suggestedSignalType: "experiment",
    actionLabel: "Add next signal",
    confidence: level,
    evidence,
    coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
    signalMix: { ...counts, diversity, unlinked },
  };
}
