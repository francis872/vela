/**
 * Graph theory algorithms for the Vela objective dependency system.
 * All algorithms operate on adjacency-list representations.
 */

export type NodeId = string;

export interface GraphNode {
  id: NodeId;
  label: string;
  status: "on_track" | "at_risk" | "blocked" | "completed";
  priority: number;
}

export interface GraphEdge {
  from: NodeId; // objective that depends on...
  to: NodeId;   // ...this objective (must complete 'to' before 'from')
}

export interface GraphAnalysis {
  /** Nodes in topological order (start → end). Empty if cycle exists. */
  topologicalOrder: NodeId[];
  /** True if the graph contains at least one cycle (invalid state). */
  hasCycle: boolean;
  /** Edges that form cycles, so the user knows what to fix. */
  cycleEdges: GraphEdge[];
  /** The longest dependency chain (critical path). */
  criticalPath: NodeId[];
  /** How many nodes each node blocks (downstream count). */
  blockingFactor: Record<NodeId, number>;
  /** Nodes that cascade risk: if blocked/at_risk, propagate to dependents. */
  riskCascade: Record<NodeId, NodeId[]>;
  /** Nodes with no dependencies (roots = can start immediately). */
  roots: NodeId[];
  /** Nodes with no dependents (leaves = final deliverables). */
  leaves: NodeId[];
}

// ─── Build adjacency lists ────────────────────────────────────────────────────

function buildAdjacency(nodes: GraphNode[], edges: GraphEdge[]) {
  const nodeSet = new Set(nodes.map((n) => n.id));
  // successors[A] = nodes that depend on A (A must finish first)
  const successors: Record<NodeId, NodeId[]> = {};
  // predecessors[A] = nodes that A depends on
  const predecessors: Record<NodeId, NodeId[]> = {};

  for (const n of nodes) {
    successors[n.id]  = [];
    predecessors[n.id] = [];
  }

  for (const e of edges) {
    if (!nodeSet.has(e.from) || !nodeSet.has(e.to)) continue;
    successors[e.to].push(e.from);   // e.to must complete before e.from
    predecessors[e.from].push(e.to);
  }

  return { successors, predecessors };
}

// ─── Cycle detection (DFS coloring) ──────────────────────────────────────────

function detectCycles(
  nodes: GraphNode[],
  successors: Record<NodeId, NodeId[]>
): { hasCycle: boolean; cycleEdges: GraphEdge[] } {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color: Record<NodeId, number> = {};
  const cycleEdges: GraphEdge[] = [];

  for (const n of nodes) color[n.id] = WHITE;

  function dfs(u: NodeId): boolean {
    color[u] = GRAY;
    for (const v of successors[u] ?? []) {
      if (color[v] === GRAY) {
        cycleEdges.push({ from: v, to: u });
        return true;
      }
      if (color[v] === WHITE && dfs(v)) return true;
    }
    color[u] = BLACK;
    return false;
  }

  let hasCycle = false;
  for (const n of nodes) {
    if (color[n.id] === WHITE) {
      if (dfs(n.id)) hasCycle = true;
    }
  }

  return { hasCycle, cycleEdges };
}

// ─── Topological sort (Kahn's algorithm) ─────────────────────────────────────

function topologicalSort(
  nodes: GraphNode[],
  predecessors: Record<NodeId, NodeId[]>,
  successors: Record<NodeId, NodeId[]>
): NodeId[] {
  const inDegree: Record<NodeId, number> = {};
  for (const n of nodes) inDegree[n.id] = predecessors[n.id]?.length ?? 0;

  const queue: NodeId[] = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const order: NodeId[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of successors[u] ?? []) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }

  // If order.length < nodes.length → cycle exists
  return order.length === nodes.length ? order : [];
}

// ─── Critical path (longest path in DAG) ─────────────────────────────────────

function findCriticalPath(
  topoOrder: NodeId[],
  predecessors: Record<NodeId, NodeId[]>
): NodeId[] {
  if (topoOrder.length === 0) return [];

  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};

  for (const id of topoOrder) {
    dist[id] = 0;
    prev[id] = null;
  }

  for (const u of topoOrder) {
    for (const v of predecessors[u] ?? []) {
      if (dist[v] + 1 > dist[u]) {
        dist[u] = dist[v] + 1;
        prev[u] = v;
      }
    }
  }

  // Find node with max distance
  let end = topoOrder[0];
  for (const id of topoOrder) {
    if (dist[id] > dist[end]) end = id;
  }

  // Reconstruct path
  const path: NodeId[] = [];
  let cur: NodeId | null = end;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }

  return path.length > 1 ? path : [];
}

// ─── Blocking factor & risk cascade ──────────────────────────────────────────

function computeBlockingFactor(
  nodes: GraphNode[],
  successors: Record<NodeId, NodeId[]>
): Record<NodeId, number> {
  const factor: Record<NodeId, number> = {};

  function countDownstream(id: NodeId, visited: Set<NodeId>): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    let count = 0;
    for (const v of successors[id] ?? []) {
      count += 1 + countDownstream(v, visited);
    }
    return count;
  }

  for (const n of nodes) {
    factor[n.id] = countDownstream(n.id, new Set());
  }

  return factor;
}

function computeRiskCascade(
  nodes: GraphNode[],
  successors: Record<NodeId, NodeId[]>
): Record<NodeId, NodeId[]> {
  const cascade: Record<NodeId, NodeId[]> = {};

  for (const n of nodes) {
    if (n.status === "blocked" || n.status === "at_risk") {
      const affected: NodeId[] = [];
      const queue = [...(successors[n.id] ?? [])];
      const visited = new Set<NodeId>([n.id]);
      while (queue.length > 0) {
        const v = queue.shift()!;
        if (visited.has(v)) continue;
        visited.add(v);
        affected.push(v);
        queue.push(...(successors[v] ?? []));
      }
      cascade[n.id] = affected;
    }
  }

  return cascade;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function analyzeGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphAnalysis {
  const { successors, predecessors } = buildAdjacency(nodes, edges);
  const { hasCycle, cycleEdges } = detectCycles(nodes, successors);
  const topoOrder = topologicalSort(nodes, predecessors, successors);
  const criticalPath = hasCycle ? [] : findCriticalPath(topoOrder, predecessors);
  const blockingFactor = computeBlockingFactor(nodes, successors);
  const riskCascade = computeRiskCascade(nodes, successors);

  const roots  = nodes.filter((n) => (predecessors[n.id]?.length ?? 0) === 0).map((n) => n.id);
  const leaves = nodes.filter((n) => (successors[n.id]?.length ?? 0) === 0).map((n) => n.id);

  return { topologicalOrder: topoOrder, hasCycle, cycleEdges, criticalPath, blockingFactor, riskCascade, roots, leaves };
}

// ─── Coverage analysis (bipartite Objectives ↔ Signals) ──────────────────────

export interface CoverageNode {
  id: NodeId;
  title: string;
  status: string;
  signalCount: number;
  signalTypes: string[];
}

export interface CoverageAnalysis {
  /** Objectives with zero signals — highest risk */
  blindSpots: NodeId[];
  /** Objectives with the most signals — validation hubs */
  hubs: NodeId[];
  /** Per-objective signal count */
  coverageMap: Record<NodeId, number>;
  /** Overall coverage ratio (0-1): objectives with ≥1 signal / total */
  coverageRatio: number;
  /** Recommended next objective to validate (blind spot + highest priority) */
  nextToValidate: NodeId | null;
}

export function analyzeCoverage(objectives: CoverageNode[]): CoverageAnalysis {
  const coverageMap: Record<NodeId, number> = {};
  for (const o of objectives) coverageMap[o.id] = o.signalCount;

  const blindSpots = objectives
    .filter((o) => o.signalCount === 0 && o.status !== "completed")
    .map((o) => o.id);

  const maxSignals = Math.max(...objectives.map((o) => o.signalCount), 1);
  const hubs = objectives
    .filter((o) => o.signalCount === maxSignals && maxSignals > 0)
    .map((o) => o.id);

  const covered = objectives.filter((o) => o.signalCount > 0).length;
  const coverageRatio = objectives.length > 0 ? covered / objectives.length : 0;

  // Next to validate: blind spot with highest priority (lowest priority number = highest)
  const blindObjs = objectives.filter((o) => blindSpots.includes(o.id));
  const nextToValidate = blindObjs.length > 0 ? blindObjs[0].id : null;

  return { blindSpots, hubs, coverageMap, coverageRatio, nextToValidate };
}
