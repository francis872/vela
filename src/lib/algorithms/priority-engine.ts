export type PriorityCandidate = {
  id: string;
  title: string;
  status: "on_track" | "at_risk" | "blocked" | "completed";
  priority: number;
  dueDate?: string | null;
  signalCount: number;
  downstreamImpact: number;
  unmetDependencies: number;
  criticalPath: boolean;
  assignedLoad?: number | null;
  resourceReady?: boolean | null;
};

export type PriorityWeights = {
  urgency: number;
  risk: number;
  impact: number;
  evidenceGap: number;
  dependency: number;
  capacity: number;
  resourceReadiness: number;
};

export type RankedPriority = PriorityCandidate & {
  score: number;
  rank: number;
  factors: {
    urgency: number;
    risk: number;
    impact: number;
    evidenceGap: number;
    dependency: number;
    capacity: number;
    resourceReadiness: number;
  };
  reasons: string[];
  executable: boolean;
};

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  urgency: 0.18,
  risk: 0.2,
  impact: 0.18,
  evidenceGap: 0.12,
  dependency: 0.12,
  capacity: 0.1,
  resourceReadiness: 0.1,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function urgencyScore(dueDate?: string | null, now = new Date()) {
  if (!dueDate) return 0.25;
  const days = (new Date(dueDate).getTime() - now.getTime()) / 86400000;
  if (days <= 0) return 1;
  if (days <= 3) return 0.9;
  if (days <= 7) return 0.75;
  if (days <= 14) return 0.5;
  return 0.2;
}

function riskScore(status: PriorityCandidate["status"]) {
  if (status === "blocked") return 1;
  if (status === "at_risk") return 0.8;
  if (status === "on_track") return 0.3;
  return 0;
}

function impactScore(candidate: PriorityCandidate, maxDownstream: number) {
  const graph = maxDownstream > 0 ? candidate.downstreamImpact / maxDownstream : 0;
  const critical = candidate.criticalPath ? 1 : 0;
  const declaredPriority = candidate.priority <= 1 ? 1 : candidate.priority === 2 ? 0.65 : 0.35;
  return clamp01(graph * 0.45 + critical * 0.35 + declaredPriority * 0.2);
}

function evidenceGapScore(signalCount: number) {
  if (signalCount === 0) return 1;
  if (signalCount === 1) return 0.65;
  if (signalCount === 2) return 0.35;
  return 0.1;
}

function dependencyScore(unmet: number) {
  if (unmet <= 0) return 0;
  if (unmet === 1) return 0.45;
  if (unmet === 2) return 0.75;
  return 1;
}

function capacityScore(load?: number | null) {
  if (load === null || load === undefined) return 0.35;
  if (load >= 8) return 1;
  if (load >= 5) return 0.75;
  if (load >= 2) return 0.4;
  return 0.15;
}

function resourceScore(ready?: boolean | null) {
  if (ready === false) return 1;
  if (ready === true) return 0.1;
  return 0.35;
}

export function rankPriorities(
  candidates: PriorityCandidate[],
  options?: { weights?: Partial<PriorityWeights>; now?: Date },
): RankedPriority[] {
  const weights = { ...DEFAULT_PRIORITY_WEIGHTS, ...(options?.weights ?? {}) };
  const maxDownstream = Math.max(0, ...candidates.map((candidate) => candidate.downstreamImpact));

  return candidates
    .filter((candidate) => candidate.status !== "completed")
    .map((candidate) => {
      const factors = {
        urgency: urgencyScore(candidate.dueDate, options?.now),
        risk: riskScore(candidate.status),
        impact: impactScore(candidate, maxDownstream),
        evidenceGap: evidenceGapScore(candidate.signalCount),
        dependency: dependencyScore(candidate.unmetDependencies),
        capacity: capacityScore(candidate.assignedLoad),
        resourceReadiness: resourceScore(candidate.resourceReady),
      };

      const raw =
        factors.urgency * weights.urgency +
        factors.risk * weights.risk +
        factors.impact * weights.impact +
        factors.evidenceGap * weights.evidenceGap +
        factors.dependency * weights.dependency +
        factors.capacity * weights.capacity +
        factors.resourceReadiness * weights.resourceReadiness;

      const score = Math.round(raw * 1000) / 10;
      const reasons: string[] = [];
      if (factors.risk >= 0.8) reasons.push(candidate.status === "blocked" ? "blocked execution" : "high execution risk");
      if (factors.urgency >= 0.75) reasons.push("near or past due");
      if (candidate.criticalPath) reasons.push("critical path");
      if (candidate.downstreamImpact > 0) reasons.push(`impacts ${candidate.downstreamImpact} downstream objective(s)`);
      if (candidate.signalCount === 0) reasons.push("no validation evidence");
      if (candidate.unmetDependencies > 0) reasons.push(`${candidate.unmetDependencies} unmet dependency(ies)`);
      if ((candidate.assignedLoad ?? 0) >= 8) reasons.push("assigned owner is overloaded");
      if (candidate.resourceReady === false) reasons.push("required resource capacity is not ready");

      return {
        ...candidate,
        score,
        rank: 0,
        factors,
        reasons,
        executable: candidate.unmetDependencies === 0 && candidate.resourceReady !== false && (candidate.assignedLoad ?? 0) < 8,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
