export type NetworkCandidate = {
  id: string;
  name: string;
  role: string;
  position: string | null;
  headline: string | null;
  availability: string | null;
  skills: string[];
  alreadyConnected: boolean;
};

export type NetworkNeed = {
  kind: "EXECUTION" | "VALIDATION" | "ANALYTICS" | "CAPITAL" | "COLLABORATION";
  title: string;
  explanation: string;
  keywords: string[];
  relationType: "collaborate" | "mentor";
  source: string;
};

export type NetworkIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  need: NetworkNeed;
  recommendation: (NetworkCandidate & { score: number; reasons: string[] }) | null;
  alternatives: (NetworkCandidate & { score: number; reasons: string[] })[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function candidateScore(candidate: NetworkCandidate, need: NetworkNeed) {
  const haystack = [
    candidate.position,
    candidate.headline,
    ...candidate.skills,
  ].map(normalize).join(" ");

  let score = 0;
  const reasons: string[] = [];
  for (const keyword of need.keywords) {
    if (haystack.includes(keyword.toLowerCase())) {
      score += 3;
      reasons.push(`matches “${keyword}”`);
    }
  }
  if (candidate.skills.length > 0) score += 1;
  if (candidate.availability === "open_to_collaborate" || candidate.availability === "mentoring") {
    score += 2;
    reasons.push(candidate.availability === "mentoring" ? "available for mentoring" : "open to collaborate");
  }
  if (candidate.role === "analista" && (need.kind === "ANALYTICS" || need.kind === "VALIDATION")) score += 1;
  if (candidate.alreadyConnected) score -= 100;
  return { score, reasons };
}

export function synthesizeNetworkIntelligence(input: {
  candidates: NetworkCandidate[];
  blockedObjective: { id: string; title: string } | null;
  interviews: number;
  metrics: number;
  pendingCapitalGates: number;
  openRelayBlockers: number;
  currentConnections: number;
}): NetworkIntelligence {
  let need: NetworkNeed;

  if (input.blockedObjective) {
    need = {
      kind: "EXECUTION",
      title: `Unblock “${input.blockedObjective.title}”`,
      explanation: "A Build objective is blocked. Network should find a collaborator who can help remove the execution constraint.",
      keywords: ["product", "engineering", "operations", "strategy", "execution", "software", "technology"],
      relationType: "collaborate",
      source: `objective:${input.blockedObjective.id}`,
    };
  } else if (input.interviews === 0) {
    need = {
      kind: "VALIDATION",
      title: "Add customer-discovery capability",
      explanation: "Validate has no interview evidence. Find someone with customer, research, growth or market experience.",
      keywords: ["customer", "research", "growth", "market", "sales", "discovery", "marketing"],
      relationType: "mentor",
      source: "validation:interviews_missing",
    };
  } else if (input.metrics === 0) {
    need = {
      kind: "ANALYTICS",
      title: "Add measurable validation capability",
      explanation: "Validation lacks quantitative evidence. Find a profile with analytics, data or measurement experience.",
      keywords: ["data", "analytics", "metric", "bi", "statistics", "growth", "experiment"],
      relationType: "collaborate",
      source: "validation:metrics_missing",
    };
  } else if (input.pendingCapitalGates > 0) {
    need = {
      kind: "CAPITAL",
      title: "Strengthen capital-readiness guidance",
      explanation: "Capital gates remain unresolved. Find someone with finance, investment, fundraising or strategy experience.",
      keywords: ["finance", "investment", "fundraising", "capital", "venture", "strategy", "investor"],
      relationType: "mentor",
      source: "capital:pending_gates",
    };
  } else {
    need = {
      kind: "COLLABORATION",
      title: "Expand the venture's collaboration surface",
      explanation: "No dominant capability gap is visible. Build one high-quality collaboration path that complements the current network.",
      keywords: ["founder", "product", "growth", "strategy", "technology", "operations"],
      relationType: "collaborate",
      source: "network:general",
    };
  }

  const scored = input.candidates
    .map((candidate) => ({ ...candidate, ...candidateScore(candidate, need) }))
    .filter((candidate) => !candidate.alreadyConnected && candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const recommendation = scored[0] ?? null;
  const confidence = recommendation
    ? recommendation.score >= 7 ? "HIGH" : recommendation.score >= 4 ? "MEDIUM" : "LOW"
    : "LOW";
  const status = input.openRelayBlockers > 0 && !recommendation
    ? "ATTENTION"
    : recommendation
      ? "FOCUS"
      : input.currentConnections > 0
        ? "STABLE"
        : "SETUP";

  return {
    status,
    title: recommendation
      ? `${recommendation.name} is the strongest current network match.`
      : status === "STABLE"
        ? "No new high-confidence match is visible."
        : "The network does not yet contain a strong match for this need.",
    explanation: recommendation
      ? `${need.explanation} VELA matched this profile using declared role, position, availability and skills; it is a relevance heuristic, not a guarantee of fit.`
      : `${need.explanation} Expand or complete network profiles before VELA recommends a person.`,
    need,
    recommendation,
    alternatives: scored.slice(1, 4),
    confidence,
    evidence: [
      need.source,
      `candidates:${input.candidates.length}`,
      `connections:${input.currentConnections}`,
      `relay_blockers:${input.openRelayBlockers}`,
      `interviews:${input.interviews}`,
      `metrics:${input.metrics}`,
      `pending_capital_gates:${input.pendingCapitalGates}`,
    ],
  };
}
