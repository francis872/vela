export type EngineIntelligenceInput = {
  activeSprint: { id: string; title: string; status: string; completion: number; remaining: number } | null;
  genome: {
    shi: number | null;
    pmf: number | null;
    risk: number | null;
    velocity: number | null;
    readiness: number | null;
    health: number | null;
    momentum: number | null;
  };
  trajectory: {
    status: string;
    executionRisk: string | null;
    validationRisk: string | null;
    factors: string[];
  };
};

export type EngineIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  action: { label: string; kind: "SPRINT" | "VALIDATE" | "BUILD" | "REVIEW" };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  focusMetric: string;
  evidence: string[];
};

function confidence(input: EngineIntelligenceInput) {
  const values = Object.values(input.genome).filter((v) => typeof v === "number");
  if (values.length >= 5 && input.activeSprint) return "HIGH" as const;
  if (values.length >= 2 || input.activeSprint) return "MEDIUM" as const;
  return "LOW" as const;
}

export function synthesizeEngineIntelligence(input: EngineIntelligenceInput): EngineIntelligence {
  const evidence = [
    input.activeSprint ? `sprint_completion:${input.activeSprint.completion}` : "sprint:none",
    input.genome.velocity !== null ? `velocity:${input.genome.velocity}` : "velocity:insufficient",
    input.genome.pmf !== null ? `pmf:${input.genome.pmf}` : "pmf:insufficient",
    input.genome.risk !== null ? `risk:${input.genome.risk}` : "risk:insufficient",
    input.genome.health !== null ? `health:${input.genome.health}` : "health:insufficient",
  ];
  const level = confidence(input);

  if (!input.activeSprint) {
    return {
      status: "SETUP",
      title: "Execution has no active operating cycle.",
      explanation: "Create a Sprint with a small number of explicit commitments so VELA can measure throughput, completion and execution reliability.",
      action: { label: "Create Sprint", kind: "SPRINT" },
      confidence: level,
      focusMetric: "Execution Velocity",
      evidence,
    };
  }

  if (input.activeSprint.status === "blocked" || input.trajectory.executionRisk === "HIGH") {
    return {
      status: "ATTENTION",
      title: "Execution reliability is the immediate constraint.",
      explanation: `The active Sprint is at ${input.activeSprint.completion}% completion with ${input.activeSprint.remaining} commitment(s) remaining. Reduce scope or remove the blocking dependency before adding new work.`,
      action: { label: "Review Sprint blockers", kind: "REVIEW" },
      confidence: level,
      focusMetric: "Operational Health",
      evidence,
    };
  }

  if ((input.genome.pmf ?? 100) < 40 || input.trajectory.validationRisk === "HIGH") {
    return {
      status: "FOCUS",
      title: "The next cycle should increase learning, not output.",
      explanation: "Validation evidence is weaker than the current execution system. Use the next commitments to collect market evidence before increasing build load.",
      action: { label: "Plan validation work", kind: "VALIDATE" },
      confidence: level,
      focusMetric: "PMF Evidence",
      evidence,
    };
  }

  if ((input.genome.velocity ?? 0) < 40 && input.activeSprint.completion < 60) {
    return {
      status: "FOCUS",
      title: "Finish the current cycle before expanding scope.",
      explanation: `Sprint completion is ${input.activeSprint.completion}% and Execution Velocity remains low. Close existing commitments before creating additional work.`,
      action: { label: "Complete current Sprint", kind: "REVIEW" },
      confidence: level,
      focusMetric: "Execution Velocity",
      evidence,
    };
  }

  if ((input.genome.health ?? 100) < 50) {
    return {
      status: "FOCUS",
      title: "Operational health needs a smaller execution surface.",
      explanation: "The venture has enough activity to operate, but objective health and execution structure are weak. Use the next Sprint to remove one high-leverage constraint.",
      action: { label: "Review Build priorities", kind: "BUILD" },
      confidence: level,
      focusMetric: "Operational Health",
      evidence,
    };
  }

  return {
    status: "STABLE",
    title: "Execution cadence is healthy enough to compound.",
    explanation: `The active Sprint is ${input.activeSprint.completion}% complete and no dominant execution risk is visible. Protect focus and avoid broadening the cycle unnecessarily.`,
    action: { label: "Continue current Sprint", kind: "REVIEW" },
    confidence: level,
    focusMetric: "Execution Velocity",
    evidence,
  };
}
