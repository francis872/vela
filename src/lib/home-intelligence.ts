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

  const confidence = confidenceFromEvidence(input);

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
