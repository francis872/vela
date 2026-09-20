export type RelayIntelligenceInput = {
  threads: {
    id: string;
    title: string;
    category: "update" | "blocker" | "decision" | "win";
    createdAt: Date;
  }[];
  decisions: {
    id: string;
    title: string;
    outcome: string | null;
    createdAt: Date;
  }[];
  connections: {
    id: string;
    type: string;
    createdAt: Date;
  }[];
  now?: Date;
};

export type RelayIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  action: { label: string; target: "BLOCKERS" | "DECISIONS" | "NETWORK" | "PUBLISH" };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  focus: string;
  evidence: string[];
  health: {
    openBlockers: number;
    staleBlockers: number;
    pendingDecisions: number;
    staleDecisions: number;
    recentActivity: number;
    connections: number;
    collaborationConnections: number;
  };
};

const DAY = 86400000;

export function synthesizeRelayIntelligence(input: RelayIntelligenceInput): RelayIntelligence {
  const now = input.now ?? new Date();
  const recentCutoff = new Date(now.getTime() - 7 * DAY);
  const staleDecisionCutoff = new Date(now.getTime() - 14 * DAY);

  const blockers = input.threads.filter((thread) => thread.category === "blocker");
  const staleBlockers = blockers.filter((thread) => thread.createdAt < recentCutoff);
  const pendingDecisions = input.decisions.filter((decision) => !decision.outcome);
  const staleDecisions = pendingDecisions.filter((decision) => decision.createdAt < staleDecisionCutoff);
  const recentActivity =
    input.threads.filter((thread) => thread.createdAt >= recentCutoff).length +
    input.decisions.filter((decision) => decision.createdAt >= recentCutoff).length;
  const collaborationConnections = input.connections.filter((connection) => connection.type === "collaborate" || connection.type === "mentor").length;

  const health = {
    openBlockers: blockers.length,
    staleBlockers: staleBlockers.length,
    pendingDecisions: pendingDecisions.length,
    staleDecisions: staleDecisions.length,
    recentActivity,
    connections: input.connections.length,
    collaborationConnections,
  };

  const evidence = [
    `open_blockers:${health.openBlockers}`,
    `stale_blockers:${health.staleBlockers}`,
    `pending_decisions:${health.pendingDecisions}`,
    `stale_decisions:${health.staleDecisions}`,
    `recent_activity:${health.recentActivity}`,
    `connections:${health.connections}`,
    `collaboration_connections:${health.collaborationConnections}`,
  ];

  const confidence =
    input.threads.length + input.decisions.length >= 8 && input.connections.length >= 2
      ? "HIGH"
      : input.threads.length + input.decisions.length + input.connections.length > 0
        ? "MEDIUM"
        : "LOW";

  if (!input.threads.length && !input.decisions.length && !input.connections.length) {
    return {
      status: "SETUP",
      title: "Relay has no collaboration evidence yet.",
      explanation: "Publish an operating update, record a decision or create a connection so VELA can evaluate collaboration health.",
      action: { label: "Publish first update", target: "PUBLISH" },
      confidence,
      focus: "Collaboration Setup",
      evidence,
      health,
    };
  }

  if (staleBlockers.length > 0) {
    return {
      status: "ATTENTION",
      title: "A blocker has become collaboration debt.",
      explanation: `${staleBlockers.length} blocker(s) have remained open for more than 7 days. Route them to a collaborator or convert them into an explicit decision before they silently drag execution.`,
      action: { label: "Resolve stale blockers", target: "BLOCKERS" },
      confidence,
      focus: "Blocker Resolution",
      evidence,
      health,
    };
  }

  if (staleDecisions.length > 0) {
    return {
      status: "ATTENTION",
      title: "Decision learning is incomplete.",
      explanation: `${staleDecisions.length} decision(s) have no recorded outcome after 14 days. Close the feedback loop so VELA can learn what actually worked.`,
      action: { label: "Close decision outcomes", target: "DECISIONS" },
      confidence,
      focus: "Decision Learning",
      evidence,
      health,
    };
  }

  if (blockers.length > 0 && collaborationConnections === 0) {
    return {
      status: "FOCUS",
      title: "Blockers exist without a collaboration path.",
      explanation: "Relay contains active blockers, but the current network has no mentor or collaboration connection. Build a path to someone who can help move the constraint.",
      action: { label: "Open collaboration network", target: "NETWORK" },
      confidence,
      focus: "Collaboration Routing",
      evidence,
      health,
    };
  }

  if (pendingDecisions.length > 0) {
    return {
      status: "FOCUS",
      title: "Decisions are waiting for outcome evidence.",
      explanation: `${pendingDecisions.length} decision(s) still have no outcome. Record the result once evidence is available so the venture can retain decision quality over time.`,
      action: { label: "Review pending decisions", target: "DECISIONS" },
      confidence,
      focus: "Decision Outcomes",
      evidence,
      health,
    };
  }

  if (recentActivity === 0) {
    return {
      status: "FOCUS",
      title: "Collaboration activity has gone quiet.",
      explanation: "No Relay update or decision has been recorded in the last 7 days. Publish a concise operating signal so the network has current context.",
      action: { label: "Publish operating update", target: "PUBLISH" },
      confidence,
      focus: "Operating Visibility",
      evidence,
      health,
    };
  }

  return {
    status: "STABLE",
    title: "The collaboration loop is active.",
    explanation: "No stale blocker or unresolved decision dominates the current collaboration picture. Keep operating context fresh and route new constraints early.",
    action: { label: "Publish next update", target: "PUBLISH" },
    confidence,
    focus: "Collaboration Health",
    evidence,
    health,
  };
}
