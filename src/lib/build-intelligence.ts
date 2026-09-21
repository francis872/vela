import { analyzeCoverage, analyzeGraph, type CoverageNode, type GraphEdge, type GraphNode } from "@/lib/graph";
import { rankPriorities } from "@/lib/algorithms/priority-engine";
import { propagateRisk } from "@/lib/algorithms/risk-propagation";

export type BuildObjectiveInput = CoverageNode & {
  priority: number;
  dueDate?: string | null;
};

export type BuildIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  focusObjectiveId: string | null;
  focusObjectiveTitle: string | null;
  action: { label: string; view: "board" | "graph"; filter?: string };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  graph: {
    criticalPath: string[];
    criticalPathTitles: string[];
    topBlockers: { id: string; title: string; downstream: number }[];
    riskCascades: { id: string; title: string; affected: number }[];
    hasCycle: boolean;
  };
  coverage: {
    ratio: number;
    blindSpots: { id: string; title: string; priority: number }[];
    nextToValidate: string | null;
  };
  computationalRisk: {
    topSystemicRiskId: string | null;
    topSystemicRiskTitle: string | null;
    propagatedRisk: number | null;
    downstreamAffected: number;
  };
  optimization: {
    topPriorityId: string | null;
    topPriorityTitle: string | null;
    score: number | null;
    executable: boolean | null;
    reasons: string[];
  };
  prematureWork: {
    id: string;
    title: string;
    unmetDependencies: { id: string; title: string; status: string }[];
  }[];
};

function confidence(input: {
  objectives: BuildObjectiveInput[];
  edges: GraphEdge[];
  totalSignals: number;
}) {
  let score = 0;
  if (input.objectives.length >= 2) score += 1;
  if (input.edges.length > 0) score += 1;
  if (input.totalSignals > 0) score += 1;
  return score === 3 ? "HIGH" as const : score >= 1 ? "MEDIUM" as const : "LOW" as const;
}

export function synthesizeBuildIntelligence(input: {
  objectives: BuildObjectiveInput[];
  edges: GraphEdge[];
  totalSignals: number;
}): BuildIntelligence {
  const nodes: GraphNode[] = input.objectives.map((objective) => ({
    id: objective.id,
    label: objective.title,
    status: objective.status as GraphNode["status"],
    priority: objective.priority,
  }));
  const graph = analyzeGraph(nodes, input.edges);
  const coverage = analyzeCoverage(input.objectives);
  const byId = new Map(input.objectives.map((objective) => [objective.id, objective]));

  const dependencies = new Map<string, string[]>();
  for (const objective of input.objectives) dependencies.set(objective.id, []);
  for (const edge of input.edges) dependencies.get(edge.from)?.push(edge.to);

  const prematureWork = input.objectives
    .filter((objective) => objective.status !== "completed" && objective.status !== "blocked")
    .map((objective) => {
      const unmetDependencies = (dependencies.get(objective.id) ?? [])
        .map((id) => byId.get(id))
        .filter((dependency): dependency is BuildObjectiveInput => Boolean(dependency) && dependency.status !== "completed")
        .map((dependency) => ({ id: dependency.id, title: dependency.title, status: dependency.status }));
      return { id: objective.id, title: objective.title, unmetDependencies };
    })
    .filter((item) => item.unmetDependencies.length > 0);

  const topBlockers = Object.entries(graph.blockingFactor)
    .filter(([, downstream]) => downstream > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, downstream]) => ({ id, title: byId.get(id)?.title ?? id, downstream }));

  const riskCascades = Object.entries(graph.riskCascade)
    .filter(([, affected]) => affected.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([id, affected]) => ({ id, title: byId.get(id)?.title ?? id, affected: affected.length }));

  const blindSpots = coverage.blindSpots
    .map((id) => byId.get(id))
    .filter((objective): objective is BuildObjectiveInput => Boolean(objective))
    .sort((a, b) => a.priority - b.priority)
    .map((objective) => ({ id: objective.id, title: objective.title, priority: objective.priority }));

  const criticalPathTitles = graph.criticalPath.map((id) => byId.get(id)?.title ?? id);
  const baseEvidence = [
    `objectives:${input.objectives.length}`,
    `dependencies:${input.edges.length}`,
    `signals:${input.totalSignals}`,
    `coverage:${Math.round(coverage.coverageRatio * 100)}`,
  ];
  const resultConfidence = confidence(input);
  const propagatedRisk = propagateRisk(
    input.objectives.map((objective) => ({
      id: objective.id,
      baseRisk: objective.status === "blocked" ? 1 : objective.status === "at_risk" ? 0.8 : objective.status === "on_track" ? 0.25 : 0,
    })),
    input.edges,
  );
  const systemic = propagatedRisk.topSystemicRisks[0] ?? null;
  const computationalRisk = {
    topSystemicRiskId: systemic?.id ?? null,
    topSystemicRiskTitle: systemic ? byId.get(systemic.id)?.title ?? systemic.id : null,
    propagatedRisk: systemic?.propagatedRisk ?? null,
    downstreamAffected: systemic?.downstreamAffected ?? 0,
  };
  const optimizationRanking = rankPriorities(input.objectives.map((objective) => ({
    id: objective.id,
    title: objective.title,
    status: objective.status,
    priority: objective.priority,
    dueDate: objective.dueDate,
    signalCount: objective.signalCount,
    downstreamImpact: graph.blockingFactor[objective.id] ?? 0,
    unmetDependencies: (dependencies.get(objective.id) ?? []).filter((id) => byId.get(id)?.status !== "completed").length,
    criticalPath: graph.criticalPath.includes(objective.id),
    assignedLoad: null,
    resourceReady: null,
  })));
  const optimized = optimizationRanking[0] ?? null;
  const optimization = {
    topPriorityId: optimized?.id ?? null,
    topPriorityTitle: optimized?.title ?? null,
    score: optimized?.score ?? null,
    executable: optimized?.executable ?? null,
    reasons: optimized?.reasons ?? [],
  };

  if (!input.objectives.length) {
    return {
      status: "SETUP",
      title: "Define the first execution objective.",
      explanation: "Build Intelligence needs at least one persisted objective before it can analyze execution structure.",
      focusObjectiveId: null,
      focusObjectiveTitle: null,
      action: { label: "Create objective", view: "board" },
      confidence: "LOW",
      evidence: baseEvidence,
      graph: { criticalPath: [], criticalPathTitles: [], topBlockers: [], riskCascades: [], hasCycle: false },
      coverage: { ratio: 0, blindSpots: [], nextToValidate: null },
      computationalRisk,
      optimization,
      prematureWork: [],
    };
  }

  if (graph.hasCycle) {
    return {
      status: "ATTENTION",
      title: "The dependency graph contains a cycle.",
      explanation: "Execution order is invalid because at least one objective ultimately depends on itself. Resolve the circular dependency before using the plan as an execution sequence.",
      focusObjectiveId: graph.cycleEdges[0]?.from ?? null,
      focusObjectiveTitle: graph.cycleEdges[0]?.from ? byId.get(graph.cycleEdges[0].from)?.title ?? null : null,
      action: { label: "Resolve dependency cycle", view: "graph" },
      confidence: resultConfidence,
      evidence: [...baseEvidence, `cycle_edges:${graph.cycleEdges.length}`],
      graph: { criticalPath: graph.criticalPath, criticalPathTitles, topBlockers, riskCascades, hasCycle: true },
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      computationalRisk,
      optimization,
      prematureWork,
    };
  }

  const dominantCascade = riskCascades[0];
  if (dominantCascade) {
    return {
      status: "ATTENTION",
      title: "Execution risk is cascading through dependencies.",
      explanation: `“${dominantCascade.title}” currently exposes ${dominantCascade.affected} downstream objective(s). Resolve the upstream constraint before increasing downstream scope.`,
      focusObjectiveId: dominantCascade.id,
      focusObjectiveTitle: dominantCascade.title,
      action: { label: "Inspect risk cascade", view: "graph" },
      confidence: resultConfidence,
      evidence: [...baseEvidence, `risk_cascade:${dominantCascade.affected}`],
      graph: { criticalPath: graph.criticalPath, criticalPathTitles, topBlockers, riskCascades, hasCycle: false },
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      computationalRisk,
      optimization,
      prematureWork,
    };
  }

  const premature = prematureWork[0];
  if (premature) {
    return {
      status: "FOCUS",
      title: "Some work should not start yet.",
      explanation: `“${premature.title}” has ${premature.unmetDependencies.length} unfinished prerequisite(s). Complete the dependency chain before treating this objective as executable work.`,
      focusObjectiveId: premature.id,
      focusObjectiveTitle: premature.title,
      action: { label: "Review dependencies", view: "graph" },
      confidence: resultConfidence,
      evidence: [...baseEvidence, `unmet_dependencies:${premature.unmetDependencies.length}`],
      graph: { criticalPath: graph.criticalPath, criticalPathTitles, topBlockers, riskCascades, hasCycle: false },
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      computationalRisk,
      optimization,
      prematureWork,
    };
  }

  const blindSpot = blindSpots[0];
  if (blindSpot) {
    return {
      status: "FOCUS",
      title: "Execution is ahead of evidence.",
      explanation: `“${blindSpot.title}” has no linked validation evidence. Before increasing commitment, attach a signal that supports or challenges the objective.`,
      focusObjectiveId: blindSpot.id,
      focusObjectiveTitle: blindSpot.title,
      action: { label: "Review evidence gap", view: "board", filter: byId.get(blindSpot.id)?.status },
      confidence: resultConfidence,
      evidence: [...baseEvidence, `blind_spots:${blindSpots.length}`],
      graph: { criticalPath: graph.criticalPath, criticalPathTitles, topBlockers, riskCascades, hasCycle: false },
      coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
      computationalRisk,
      optimization,
      prematureWork,
    };
  }

  const critical = graph.criticalPath.find((id) => byId.get(id)?.status !== "completed") ?? null;
  return {
    status: "STABLE",
    title: critical ? "Execution structure is clear. Protect the critical path." : "Execution structure is clear.",
    explanation: critical
      ? `“${byId.get(critical)?.title ?? critical}” is on the critical path. Keep dependencies resolved and avoid adding work that does not advance the current chain.`
      : "No structural blocker, dependency conflict or evidence blind spot is dominant in the current plan.",
    focusObjectiveId: critical,
    focusObjectiveTitle: critical ? byId.get(critical)?.title ?? critical : null,
    action: { label: critical ? "View critical path" : "Review board", view: critical ? "graph" : "board" },
    confidence: resultConfidence,
    evidence: baseEvidence,
    graph: { criticalPath: graph.criticalPath, criticalPathTitles, topBlockers, riskCascades, hasCycle: false },
    coverage: { ratio: coverage.coverageRatio, blindSpots, nextToValidate: coverage.nextToValidate },
    prematureWork,
  };
}
