export type DecisionIntelligenceInput = {
  id: string;
  title: string;
  expectedOutcome: string | null;
  evidence: string[];
  reviewAt: Date | null;
  outcome: string | null;
  outcomeStatus: string | null;
  learnedAt: Date | null;
  createdAt: Date;
};

export type DecisionIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  focusDecisionId: string | null;
  focus: string;
  action: { label: string; kind: "CREATE" | "EVIDENCE" | "REVIEW" | "LEARN" | "NONE" };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  health: {
    total: number;
    pending: number;
    overdue: number;
    withoutEvidence: number;
    awaitingLearning: number;
    closed: number;
  };
};

export function synthesizeDecisionIntelligence(decisions: DecisionIntelligenceInput[], now = new Date()): DecisionIntelligence {
  const pending = decisions.filter((d) => !d.outcome);
  const overdue = pending.filter((d) => d.reviewAt && d.reviewAt <= now);
  const withoutEvidence = pending.filter((d) => d.evidence.length === 0);
  const awaitingLearning = decisions.filter((d) => d.outcome && !d.learnedAt);
  const closed = decisions.filter((d) => d.outcome && d.learnedAt);

  const health = {
    total: decisions.length,
    pending: pending.length,
    overdue: overdue.length,
    withoutEvidence: withoutEvidence.length,
    awaitingLearning: awaitingLearning.length,
    closed: closed.length,
  };
  const evidence = [
    `decisions:${health.total}`, `pending:${health.pending}`, `overdue:${health.overdue}`,
    `without_evidence:${health.withoutEvidence}`, `awaiting_learning:${health.awaitingLearning}`, `closed:${health.closed}`,
  ];
  const confidence = decisions.length >= 8 ? "HIGH" : decisions.length >= 3 ? "MEDIUM" : "LOW";

  if (!decisions.length) return {
    status: "SETUP", title: "Create the first evidence-backed decision.",
    explanation: "VELA has no decision history yet. Record the choice, expected outcome, supporting evidence and review date so the result can be evaluated later.",
    focusDecisionId: null, focus: "Decision Setup", action: { label: "Create decision", kind: "CREATE" }, confidence, evidence, health,
  };

  const focus = overdue[0];
  if (focus) return {
    status: "ATTENTION", title: `“${focus.title}” is due for review.`,
    explanation: "Its review date has passed without a recorded outcome. Compare the actual result with the expected outcome and close the feedback loop.",
    focusDecisionId: focus.id, focus: "Overdue Review", action: { label: "Record outcome", kind: "REVIEW" }, confidence, evidence, health,
  };

  const unsupported = withoutEvidence[0];
  if (unsupported) return {
    status: "FOCUS", title: `“${unsupported.title}” lacks supporting evidence.`,
    explanation: "The decision is still open but has no evidence references. Add the observations, signals or facts that justified the choice.",
    focusDecisionId: unsupported.id, focus: "Evidence Quality", action: { label: "Review evidence", kind: "EVIDENCE" }, confidence, evidence, health,
  };

  const learning = awaitingLearning[0];
  if (learning) return {
    status: "FOCUS", title: `“${learning.title}” has an outcome but no consolidated learning.`,
    explanation: "The result is known. Consolidate whether the decision worked, partially worked or failed so future decisions can reuse the lesson.",
    focusDecisionId: learning.id, focus: "Decision Learning", action: { label: "Consolidate learning", kind: "LEARN" }, confidence, evidence, health,
  };

  return {
    status: "STABLE", title: "The decision loop is current.",
    explanation: pending.length ? `${pending.length} decision(s) are open but none is overdue or missing evidence.` : "All recorded decisions have outcomes and consolidated learning.",
    focusDecisionId: pending[0]?.id ?? null, focus: "Decision Health", action: { label: "Decision log current", kind: "NONE" }, confidence, evidence, health,
  };
}
