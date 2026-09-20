import type { CapitalReadinessResponse } from "@/lib/functional-contracts";

export type CapitalIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  action: { label: string; href: string };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  focus: string;
  evidence: string[];
};

export function synthesizeCapitalIntelligence(data: CapitalReadinessResponse): CapitalIntelligence {
  const { evidence, gates, readiness } = data;
  const executionRate = evidence.sprints.total ? evidence.sprints.completed / evidence.sprints.total : null;
  const objectiveRate = evidence.objectives.total ? evidence.objectives.completed / evidence.objectives.total : null;
  const evidenceList = [
    `readiness:${readiness ?? "insufficient"}`,
    `gates:${gates.passed}/${gates.total}`,
    `interviews:${evidence.signals.interviews}`,
    `metrics:${evidence.signals.metrics}`,
    `sprints:${evidence.sprints.completed}/${evidence.sprints.total}`,
    `objectives:${evidence.objectives.completed}/${evidence.objectives.total}`,
  ];
  const confidence = gates.total >= 2 && evidence.signals.total >= 3 && evidence.sprints.total >= 1 ? "HIGH" : gates.total || evidence.signals.total ? "MEDIUM" : "LOW";

  if (data.status === "INSUFFICIENT_DATA" || readiness === null) {
    const next = data.missing[0] ?? { label: "Build evidence", href: "/build" };
    return {
      status: "SETUP",
      title: "Capital readiness cannot be established yet.",
      explanation: "VELA does not have enough operating and market evidence to support a capital-readiness assessment.",
      action: { label: next.label, href: next.href },
      confidence,
      focus: "Evidence Base",
      evidence: evidenceList,
    };
  }

  if (evidence.signals.interviews === 0 || evidence.signals.metrics === 0) {
    return {
      status: "ATTENTION",
      title: "Fundraising evidence is weaker than the capital narrative.",
      explanation: "Before advancing capital gates, add both direct customer evidence and measurable traction so readiness is grounded in external proof.",
      action: { label: "Strengthen validation", href: "/validate" },
      confidence,
      focus: "Market Evidence",
      evidence: evidenceList,
    };
  }

  if (executionRate !== null && executionRate < 0.5) {
    return {
      status: "FOCUS",
      title: "Execution reliability is limiting capital readiness.",
      explanation: `Only ${evidence.sprints.completed} of ${evidence.sprints.total} Sprint(s) are completed. Strengthen delivery consistency before treating readiness as fundraising momentum.`,
      action: { label: "Strengthen execution", href: "/engine" },
      confidence,
      focus: "Execution Reliability",
      evidence: evidenceList,
    };
  }

  if (objectiveRate !== null && objectiveRate < 0.4) {
    return {
      status: "FOCUS",
      title: "Too much strategic work remains unresolved.",
      explanation: "Validation exists, but objective completion is still weak. Capital preparation should follow resolution of the highest-leverage execution objectives.",
      action: { label: "Review Build priorities", href: "/build" },
      confidence,
      focus: "Objective Completion",
      evidence: evidenceList,
    };
  }

  if (gates.total === 0 || gates.pending > 0) {
    return {
      status: "FOCUS",
      title: "Evidence exists; convert it into explicit capital gates.",
      explanation: `${gates.pending} gate(s) remain pending. Review their criteria against current evidence instead of advancing them on narrative alone.`,
      action: { label: gates.total ? "Review pending gates" : "Define capital gates", href: "/capital" },
      confidence,
      focus: "Capital Gates",
      evidence: evidenceList,
    };
  }

  return {
    status: "STABLE",
    title: "Capital preparation is supported by operating evidence.",
    explanation: "Current validation, execution history and gate outcomes provide a coherent evidence base. Continue strengthening the record as the venture advances.",
    action: { label: "Review capital evidence", href: "/capital" },
    confidence,
    focus: "Capital Readiness",
    evidence: evidenceList,
  };
}
