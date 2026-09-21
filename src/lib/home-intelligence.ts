export type HomeIntelligenceInput = {
  command: {
    status: string;
    priority: string;
    title: string;
    explanation: string;
    affectedMetric: string;
    evidence: string[];
  };
  metrics: {
    velocity: number | null;
    validation: number | null;
    risk: number | null;
    readiness: number | null;
  };
  sprint: {
    status: string;
    totalItems: number;
    completedItems: number;
  } | null;
  executionRisk: {
    status: string;
    level: string | null;
    factors: string[];
  };
  validationRisk: {
    status: string;
    level: string | null;
    factors: string[];
  };
  trajectory: {
    status: string;
    factors: string[];
  };
  rootCause: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA" | "NO_DOMINANT_CAUSE";
    primary: { label: string; delta: number; velocityPerDay: number; leadHours: number | null } | null;
    contributors: { label: string; delta: number; velocityPerDay: number; leadHours: number | null }[];
    explanation: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
  };
  decisionMemory?: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA";
    recommendation: { decisionTitle: string; choice: string; outcomeStatus: string; confidence: string; lesson: string } | null;
    avoidedDecision: { decisionTitle: string; choice: string; outcomeStatus: string; confidence: string; lesson: string } | null;
    memories: unknown[];
    explanation: string;
  };
  algorithms?: {
    topPriority: { id: string; title: string; score: number; executable: boolean; reasons: string[] } | null;
    systemicRisk: { id: string; propagatedRisk: number; downstreamAffected: number } | null;
    historicalAnalogue: { snapshotId: string; capturedAt: string; similarity: number; distance: number; comparedFeatures: number } | null;
    executionPlan: {
      selected: { id: string; title: string; score: number; reasons: string[] }[];
      deferred: { id: string; title: string; score: number; executable: boolean; reasons: string[] }[];
      capacity: number;
      score: number;
    };
  };
  history: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA";
    direction: "IMPROVING" | "STABLE" | "DECLINING" | null;
    velocityPerDay: number | null;
    delta: number | null;
    daysObserved: number | null;
    dynamics: {
      status: "AVAILABLE" | "INSUFFICIENT_DATA";
      state: "ACCELERATING" | "DECELERATING" | "DETERIORATING" | "TURNING_POSITIVE" | "TURNING_NEGATIVE" | "STEADY" | null;
      previousVelocityPerDay: number | null;
      recentVelocityPerDay: number | null;
      accelerationPerDay2: number | null;
      explanation: string;
    };
  };
};

export type HomeIntelligence = {
  type: "STRATEGIC_INTERPRETATION" | "OBSERVATION";
  title: string;
  body: string;
  thesis: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  tensions: string[];
  focus: string;
};

function numeric(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function confidenceFromEvidence(input: HomeIntelligenceInput) {
  let sources = 0;
  if (numeric(input.metrics.velocity)) sources += 1;
  if (numeric(input.metrics.validation)) sources += 1;
  if (numeric(input.metrics.risk)) sources += 1;
  if (numeric(input.metrics.readiness)) sources += 1;
  if (input.sprint) sources += 1;
  if (input.executionRisk.status === "AVAILABLE") sources += 1;
  if (input.validationRisk.status === "AVAILABLE") sources += 1;
  if (input.trajectory.status !== "INSUFFICIENT_DATA") sources += 1;
  if (input.history.status === "AVAILABLE") sources += 1;
  if (input.history.dynamics.status === "AVAILABLE") sources += 1;
  if (input.rootCause.status === "AVAILABLE") sources += 1;
  if (input.decisionMemory?.status === "AVAILABLE") sources += 1;
  if (input.algorithms?.topPriority) sources += 1;
  if (input.algorithms?.systemicRisk) sources += 1;
  if (input.algorithms?.historicalAnalogue) sources += 1;

  if (sources >= 6) return "HIGH" as const;
  if (sources >= 3) return "MEDIUM" as const;
  return "LOW" as const;
}

export function synthesizeHomeIntelligence(input: HomeIntelligenceInput): HomeIntelligence {
  const evidence = [...input.command.evidence];
  const tensions: string[] = [];
  const velocity = input.metrics.velocity;
  const validation = input.metrics.validation;
  const readiness = input.metrics.readiness;

  if (numeric(velocity)) evidence.push(`execution_velocity:${velocity}`);
  if (numeric(validation)) evidence.push(`validation_activity:${validation}`);
  if (numeric(readiness)) evidence.push(`capital_readiness:${readiness}`);
  if (input.executionRisk.level) evidence.push(`execution_risk:${input.executionRisk.level.toLowerCase()}`);
  if (input.validationRisk.level) evidence.push(`validation_risk:${input.validationRisk.level.toLowerCase()}`);

  if (numeric(velocity) && numeric(validation)) {
    const gap = velocity - validation;
    if (gap >= 20) tensions.push(`Execution is ${gap} points ahead of validation.`);
    if (gap <= -20) tensions.push(`Validation is ${Math.abs(gap)} points ahead of execution.`);
  }

  if (input.sprint && input.sprint.totalItems > 0) {
    const completion = Math.round((input.sprint.completedItems / input.sprint.totalItems) * 100);
    evidence.push(`sprint_completion:${completion}`);
    if (completion < 40 && input.sprint.status === "active") {
      tensions.push(`The active Sprint is only ${completion}% complete.`);
    }
  }

  if (input.executionRisk.level === "HIGH") {
    tensions.push(input.executionRisk.factors[0] ?? "Execution risk is high.");
  }
  if (input.validationRisk.level === "HIGH") {
    tensions.push(input.validationRisk.factors[0] ?? "Validation risk is high.");
  }

  if (input.decisionMemory?.status === "AVAILABLE") {
    evidence.push(`decision_memory:${input.decisionMemory.memories.length}`);
    if (input.decisionMemory.recommendation) {
      evidence.push(`prior_decision_positive:${input.decisionMemory.recommendation.outcomeStatus.toLowerCase()}`);
    }
    if (input.decisionMemory.avoidedDecision) {
      evidence.push("prior_decision_no_improvement");
      tensions.push(`A comparable prior decision — “${input.decisionMemory.avoidedDecision.decisionTitle}” — produced no improvement. Treat this as historical evidence, not proof that the same outcome will recur.`);
    }
  }

  if (input.algorithms?.topPriority) {
    evidence.push(`algorithm_priority:${input.algorithms.topPriority.score}`);
    if (!input.algorithms.topPriority.executable) tensions.push(`The highest-priority objective — “${input.algorithms.topPriority.title}” — is not currently executable under dependency, capacity or resource constraints.`);
  }
  if (input.algorithms?.systemicRisk) {
    evidence.push(`propagated_risk:${Math.round(input.algorithms.systemicRisk.propagatedRisk * 100)}`);
    if (input.algorithms.systemicRisk.downstreamAffected > 0 && input.algorithms.systemicRisk.propagatedRisk >= 0.6) tensions.push(`A systemic risk path currently reaches ${input.algorithms.systemicRisk.downstreamAffected} downstream objective(s).`);
  }
  if (input.algorithms?.historicalAnalogue) {
    evidence.push(`rbf_similarity:${Math.round(input.algorithms.historicalAnalogue.similarity * 100)}`);
  }
  if (input.algorithms?.executionPlan.selected.length) {
    evidence.push(`optimized_plan_items:${input.algorithms.executionPlan.selected.length}`);
  }

  const confidence = confidenceFromEvidence(input);
  const dynamicState = input.history.dynamics.state;
  if (input.history.status === "AVAILABLE") {
    evidence.push(`trajectory_direction:${input.history.direction?.toLowerCase() ?? "unknown"}`);
    if (input.history.velocityPerDay !== null) evidence.push(`trajectory_velocity_per_day:${input.history.velocityPerDay}`);
  }
  if (input.history.dynamics.status === "AVAILABLE" && dynamicState) {
    evidence.push(`trajectory_dynamics:${dynamicState.toLowerCase()}`);
    if (input.history.dynamics.accelerationPerDay2 !== null) evidence.push(`trajectory_acceleration:${input.history.dynamics.accelerationPerDay2}`);
  }

  if (input.algorithms?.systemicRisk && input.algorithms.systemicRisk.propagatedRisk >= 0.75 && input.algorithms.systemicRisk.downstreamAffected > 0) {
    const top = input.algorithms.topPriority;
    const plan = input.algorithms.executionPlan.selected;
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "A systemic execution risk is propagating.",
      thesis: "The dependency graph shows that current risk is not isolated to one objective.",
      body: `Propagated risk is ${Math.round(input.algorithms.systemicRisk.propagatedRisk * 100)}% across a path affecting ${input.algorithms.systemicRisk.downstreamAffected} downstream objective(s).${top ? ` The current algorithmic priority is “${top.title}” with score ${top.score}.` : ""}${plan.length ? ` The optimized executable set currently contains ${plan.length} objective(s).` : ""} Treat this as model-supported prioritization, not certainty.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: top?.title ?? "Systemic execution risk",
    };
  }

  if (dynamicState === "TURNING_NEGATIVE") {
    tensions.unshift(input.history.dynamics.explanation);
    if (input.rootCause.primary) {
      evidence.push(`root_cause:${input.rootCause.primary.label.toLowerCase().replaceAll(" ", "_")}`);
      tensions.unshift(input.rootCause.explanation);
    }
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "A negative turning point is forming.",
      thesis: "The venture has shifted from positive operating momentum into contraction.",
      body: input.rootCause.primary
        ? `${input.history.dynamics.explanation} ${input.rootCause.primary.label} changed first in the observed window. ${input.rootCause.explanation}`
        : `${input.history.dynamics.explanation} Protect validated work, reduce new scope and investigate which operating metric changed first.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Identify and reverse the source of the negative inflection.",
    };
  }

  if (dynamicState === "DETERIORATING") {
    tensions.unshift(input.history.dynamics.explanation);
    if (input.rootCause.primary) {
      evidence.push(`root_cause:${input.rootCause.primary.label.toLowerCase().replaceAll(" ", "_")}`);
      tensions.unshift(input.rootCause.explanation);
    }
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "Operating momentum is deteriorating.",
      thesis: "The current state is weaker than the historical direction, and the recent slope remains negative.",
      body: input.rootCause.primary
        ? `${input.history.dynamics.explanation} The earliest material deterioration is ${input.rootCause.primary.label}: ${input.rootCause.primary.delta} points at ${input.rootCause.primary.velocityPerDay} pts/day. This is a likely driver to investigate, not proof of causality.`
        : `${input.history.dynamics.explanation} Treat this as a trend problem rather than a single weak snapshot.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Stop deterioration before optimizing for growth.",
    };
  }

  if (dynamicState === "TURNING_POSITIVE") {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "VELA detected a positive turning point.",
      thesis: "Recent operating evidence has reversed a previously negative trajectory.",
      body: `${input.history.dynamics.explanation} Preserve the actions associated with the reversal and confirm that the improvement persists across the next snapshots.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Protect the behaviors driving the positive reversal.",
    };
  }

  if (dynamicState === "DECELERATING") {
    tensions.unshift(input.history.dynamics.explanation);
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "Progress continues, but momentum is slowing.",
      thesis: "The venture remains on a positive slope, but its rate of improvement has weakened.",
      body: `${input.history.dynamics.explanation} Find the constraint that is absorbing additional effort before momentum reaches zero.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Recover momentum by removing the emerging constraint.",
    };
  }

  if (dynamicState === "ACCELERATING") {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "Operating momentum is accelerating.",
      thesis: "Recent evidence is improving faster than the previous historical window.",
      body: `${input.history.dynamics.explanation} Avoid broadening scope prematurely; reinforce the actions producing the acceleration and validate that it is sustainable.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Sustain the drivers of acceleration without adding unnecessary scope.",
    };
  }

  if (numeric(velocity) && numeric(validation) && velocity - validation >= 20) {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "Execution is moving faster than learning.",
      thesis: "The venture is converting effort into delivery faster than it is converting market contact into evidence.",
      body: `Velocity is ${velocity} while validation is ${validation}. Keep the current operating cadence, but direct the next cycle toward customer evidence before adding more build load.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Increase validation evidence before accelerating execution.",
    };
  }

  if (input.validationRisk.level === "HIGH") {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "The main constraint is evidence, not effort.",
      thesis: "Current execution decisions are exposed because validation coverage is weak.",
      body: input.validationRisk.factors[0]
        ? `${input.validationRisk.factors[0]} Treat the next customer signal as an operating dependency, not optional research.`
        : "Validation risk is high. Treat the next customer signal as an operating dependency, not optional research.",
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Reduce validation risk with direct market evidence.",
    };
  }

  if (input.executionRisk.level === "HIGH") {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "Execution reliability is the immediate constraint.",
      thesis: "The venture has enough operational evidence to show that delivery risk is dominating the current cycle.",
      body: `${input.executionRisk.factors[0] ?? input.command.explanation} Stabilize blocked or at-risk work before expanding scope.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Restore execution reliability before increasing scope.",
    };
  }

  if (numeric(readiness) && readiness < 45 && numeric(velocity) && velocity >= 55) {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "Operational progress is not yet translating into capital readiness.",
      thesis: "The venture is executing, but the evidence required for an investment case remains incomplete.",
      body: `Execution Velocity is ${velocity}, while Capital Readiness is ${readiness}. Convert operating progress into explicit gates, validated evidence and completed objectives.`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Turn execution evidence into investment-grade proof.",
    };
  }

  if (input.decisionMemory?.status === "AVAILABLE" && input.decisionMemory.recommendation && input.command.status !== "STABLE") {
    const memory = input.decisionMemory.recommendation;
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: input.command.title,
      thesis: "The current constraint has a comparable decision pattern in VELA memory.",
      body: `${input.command.explanation} In a related prior context, “${memory.decisionTitle}” was associated with a ${memory.outcomeStatus.toLowerCase()} outcome. This is supporting historical evidence, not a guarantee or causal proof. ${memory.lesson}`,
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: input.command.affectedMetric,
    };
  }

  if (input.command.status === "STABLE") {
    return {
      type: "STRATEGIC_INTERPRETATION",
      title: "The system is stable enough to compound.",
      thesis: "No single blocker currently dominates the operating picture.",
      body: "Protect the current cadence, keep validation evidence fresh and use the next Sprint to improve one measurable constraint rather than broadening scope.",
      confidence,
      evidence: [...new Set(evidence)],
      tensions,
      focus: "Compound the current operating rhythm without adding unnecessary scope.",
    };
  }

  return {
    type: confidence === "LOW" ? "OBSERVATION" : "STRATEGIC_INTERPRETATION",
    title: input.command.title,
    thesis: "VELA is prioritizing the strongest constraint visible in the current operating evidence.",
    body: input.command.explanation,
    confidence,
    evidence: [...new Set(evidence)],
    tensions,
    focus: input.command.affectedMetric,
  };
}
