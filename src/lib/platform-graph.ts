/**
 * Platform Graph — Graph theory model connecting Users, Tools and the Platform.
 *
 * Three node types form a tripartite graph:
 *   USER nodes  — founders, analysts, operators
 *   TOOL nodes  — Vela modules (build, validate, relay, …)
 *   PLATFORM    — the meta-node representing Vela itself
 *
 * Edge types:
 *   USER → USER  : social connection (follow / collaborate / mentor)
 *   USER → TOOL  : usage event (weight = number of interactions)
 *   TOOL → TOOL  : co-usage (users that used both tools — implies relation)
 *
 * Algorithms:
 *   • Degree centrality  — how connected each node is
 *   • PageRank           — iterative influence score for users
 *   • Community clusters — Louvain-inspired label propagation
 *   • Bridge detection   — users whose removal disconnects the graph
 *   • Tool adoption map  — module engagement heat-map
 *   • Co-usage graph     — which tools appear together in user sessions
 */

export type PNodeType = "user" | "tool" | "platform";
export type PEdgeType = "social" | "usage" | "co_usage";
export type SocialType = "follow" | "collaborate" | "mentor";

export interface PlatformNode {
  id: string;
  type: PNodeType;
  label: string;
  /** Only for user nodes */
  role?: string;
  /** Only for tool nodes — number of unique users */
  userCount?: number;
}

export interface PlatformEdge {
  from: string;
  to: string;
  type: PEdgeType;
  /** Interaction count / weight (1 for social edges) */
  weight: number;
  subtype?: SocialType;
}

export interface NodeMetrics {
  id: string;
  label: string;
  type: PNodeType;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  weightedDegree: number;
  pageRank: number;
  /** Community id (integer label) */
  community: number;
  /** Is this node a bridge (its removal disconnects others)? */
  isBridge: boolean;
}

export interface PlatformAnalysis {
  /** Per-node metrics */
  metrics: NodeMetrics[];
  /** Top N influential users by PageRank */
  topInfluencers: string[];
  /** Top N most-used tools by weighted degree */
  topTools: string[];
  /** Users that act as bridges between communities */
  bridgeUsers: string[];
  /** Community → member ids */
  communities: Record<number, string[]>;
  /** Tool co-usage pairs sorted by co-occurrence count */
  coUsagePairs: Array<{ a: string; b: string; count: number }>;
  /** Overall platform density (edges / max-possible-edges) */
  density: number;
  /** How many users have ≥1 connection */
  connectedUsers: number;
  /** Tools with zero users (adoption blind spots) */
  orphanTools: string[];
}

// ─── Module registry ──────────────────────────────────────────────────────────

export const PLATFORM_MODULES: Record<string, string> = {
  build:    "Build",
  validate: "Validate",
  relay:    "Relay",
  capital:  "Capital",
  engine:   "Engine",
  vela:     "Vela OS",
  inspire:  "Inspire",
  space:    "Space",
  bizzu:    "BiZZu",
  dashboard: "Dashboard",
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface PlatformGraphInput {
  users: Array<{ id: string; name: string; role: string }>;
  /** Social connections between users */
  connections: Array<{ fromUserId: string; toUserId: string; type: SocialType }>;
  /** Activity log: which user used which module, how many times */
  activity: Array<{ userId: string; module: string; count: number }>;
}

export function buildPlatformGraph(input: PlatformGraphInput): {
  nodes: PlatformNode[];
  edges: PlatformEdge[];
  analysis: PlatformAnalysis;
} {
  const { users, connections, activity } = input;

  // ── Build nodes ────────────────────────────────────────────────────────────

  const nodes: PlatformNode[] = [];

  // User nodes
  for (const u of users) {
    nodes.push({ id: `user:${u.id}`, type: "user", label: u.name, role: u.role });
  }

  // Tool nodes — only modules that appear in activity or are registered
  const moduleIds = new Set<string>(Object.keys(PLATFORM_MODULES));
  for (const a of activity) moduleIds.add(a.module);

  for (const mod of moduleIds) {
    const userCount = activity.filter((a) => a.module === mod).reduce((acc, a) => {
      acc.add(a.userId); return acc;
    }, new Set<string>()).size;
    nodes.push({ id: `tool:${mod}`, type: "tool", label: PLATFORM_MODULES[mod] ?? mod, userCount });
  }

  // Platform meta-node
  nodes.push({ id: "platform:vela", type: "platform", label: "Vela Platform" });

  // ── Build edges ────────────────────────────────────────────────────────────

  const edges: PlatformEdge[] = [];

  // Social edges: USER → USER
  for (const c of connections) {
    edges.push({
      from: `user:${c.fromUserId}`,
      to:   `user:${c.toUserId}`,
      type: "social",
      weight: 1,
      subtype: c.type,
    });
  }

  // Usage edges: USER → TOOL  (weight = interaction count)
  const activityMap = new Map<string, number>(); // key = "userId:module"
  for (const a of activity) {
    const key = `${a.userId}:${a.module}`;
    activityMap.set(key, (activityMap.get(key) ?? 0) + a.count);
  }
  for (const [key, count] of activityMap) {
    const [userId, module] = key.split(":");
    edges.push({
      from: `user:${userId}`,
      to:   `tool:${module}`,
      type: "usage",
      weight: count,
    });
  }

  // Tool → Platform edges (all tools connect to platform meta-node)
  for (const mod of moduleIds) {
    edges.push({ from: `tool:${mod}`, to: "platform:vela", type: "co_usage", weight: 1 });
  }

  // Co-usage edges: TOOL → TOOL
  // Build: for each pair of modules used by the same user, add co-occurrence
  const userModules: Record<string, Set<string>> = {};
  for (const a of activity) {
    if (!userModules[a.userId]) userModules[a.userId] = new Set();
    userModules[a.userId].add(a.module);
  }

  const coCount: Record<string, number> = {}; // "toolA|toolB" → count
  for (const mods of Object.values(userModules)) {
    const arr = [...mods].sort();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${arr[i]}|${arr[j]}`;
        coCount[key] = (coCount[key] ?? 0) + 1;
      }
    }
  }

  const coUsagePairs: PlatformAnalysis["coUsagePairs"] = [];
  for (const [key, count] of Object.entries(coCount)) {
    const [a, b] = key.split("|");
    coUsagePairs.push({ a: `tool:${a}`, b: `tool:${b}`, count });
    edges.push({ from: `tool:${a}`, to: `tool:${b}`, type: "co_usage", weight: count });
  }
  coUsagePairs.sort((a, b) => b.count - a.count);

  // ── Analysis ───────────────────────────────────────────────────────────────
  const analysis = analyzePlatformGraph(nodes, edges, coUsagePairs);

  return { nodes, edges, analysis };
}

// ─── Core analysis algorithms ─────────────────────────────────────────────────

function analyzePlatformGraph(
  nodes: PlatformNode[],
  edges: PlatformEdge[],
  coUsagePairs: PlatformAnalysis["coUsagePairs"],
): PlatformAnalysis {
  const nodeIds = nodes.map((n) => n.id);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Degree maps
  const inDeg:      Record<string, number> = {};
  const outDeg:     Record<string, number> = {};
  const weightedDeg: Record<string, number> = {};
  for (const id of nodeIds) { inDeg[id] = 0; outDeg[id] = 0; weightedDeg[id] = 0; }
  for (const e of edges) {
    if (inDeg[e.to]  !== undefined) inDeg[e.to]++;
    if (outDeg[e.from] !== undefined) outDeg[e.from]++;
    if (weightedDeg[e.from] !== undefined) weightedDeg[e.from] += e.weight;
    if (weightedDeg[e.to]   !== undefined) weightedDeg[e.to]   += e.weight;
  }

  // ── PageRank (on social + usage sub-graph) ────────────────────────────────
  const DAMPING   = 0.85;
  const ITERS     = 30;
  const N = nodeIds.length || 1;

  const pr: Record<string, number> = {};
  for (const id of nodeIds) pr[id] = 1 / N;

  // adjacency for outgoing links
  const outLinks: Record<string, string[]> = {};
  for (const id of nodeIds) outLinks[id] = [];
  for (const e of edges) {
    if (e.type === "social" || e.type === "usage") {
      outLinks[e.from].push(e.to);
    }
  }

  for (let iter = 0; iter < ITERS; iter++) {
    const newPr: Record<string, number> = {};
    for (const id of nodeIds) {
      let rank = (1 - DAMPING) / N;
      for (const other of nodeIds) {
        if (outLinks[other].includes(id)) {
          const outCount = outLinks[other].length;
          rank += DAMPING * (pr[other] / (outCount || 1));
        }
      }
      newPr[id] = rank;
    }
    Object.assign(pr, newPr);
  }

  // ── Community detection (label propagation) ───────────────────────────────
  const community: Record<string, number> = {};
  nodeIds.forEach((id, i) => { community[id] = i; });

  const undirectedNeighbors: Record<string, string[]> = {};
  for (const id of nodeIds) undirectedNeighbors[id] = [];
  for (const e of edges) {
    undirectedNeighbors[e.from].push(e.to);
    undirectedNeighbors[e.to].push(e.from);
  }

  for (let iter = 0; iter < 10; iter++) {
    let changed = false;
    for (const id of nodeIds) {
      const neighbors = undirectedNeighbors[id];
      if (neighbors.length === 0) continue;
      const freq: Record<number, number> = {};
      for (const nb of neighbors) freq[community[nb]] = (freq[community[nb]] ?? 0) + 1;
      const best = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
      if (best !== community[id]) { community[id] = best; changed = true; }
    }
    if (!changed) break;
  }

  // Normalize community labels to sequential integers
  const labelMap: Record<number, number> = {};
  let nextLabel = 0;
  for (const id of nodeIds) {
    const c = community[id];
    if (labelMap[c] === undefined) labelMap[c] = nextLabel++;
    community[id] = labelMap[c];
  }

  // Build community → members map
  const communities: Record<number, string[]> = {};
  for (const [id, c] of Object.entries(community)) {
    communities[c] = communities[c] ?? [];
    communities[c].push(id);
  }

  // ── Bridge detection (simplified articulation-point DFS) ─────────────────
  // Only run on user nodes and social edges for efficiency
  const userNodeIds = nodeIds.filter((id) => id.startsWith("user:"));
  const socialAdj: Record<string, Set<string>> = {};
  for (const id of userNodeIds) socialAdj[id] = new Set();
  for (const e of edges) {
    if (e.type === "social" && socialAdj[e.from] && socialAdj[e.to]) {
      socialAdj[e.from].add(e.to);
      socialAdj[e.to].add(e.from);
    }
  }

  const bridges = new Set<string>();
  if (userNodeIds.length > 1) {
    const disc: Record<string, number> = {};
    const low:  Record<string, number> = {};
    const parent: Record<string, string | null> = {};
    let timer = 0;

    function dfsArticulation(u: string) {
      disc[u] = low[u] = timer++;
      let childCount = 0;
      for (const v of socialAdj[u]) {
        if (disc[v] === undefined) {
          childCount++;
          parent[v] = u;
          dfsArticulation(v);
          low[u] = Math.min(low[u], low[v]);
          // Articulation point condition
          if (parent[u] === null && childCount > 1) bridges.add(u);
          if (parent[u] !== null && low[v] >= disc[u]) bridges.add(u);
        } else if (v !== parent[u]) {
          low[u] = Math.min(low[u], disc[v]);
        }
      }
    }
    for (const id of userNodeIds) {
      if (disc[id] === undefined) { parent[id] = null; dfsArticulation(id); }
    }
  }

  // ── Assemble metrics ──────────────────────────────────────────────────────
  const metrics: NodeMetrics[] = nodeIds.map((id) => ({
    id,
    label: nodeMap.get(id)!.label,
    type:  nodeMap.get(id)!.type,
    inDegree:      inDeg[id]      ?? 0,
    outDegree:     outDeg[id]     ?? 0,
    totalDegree:   (inDeg[id] ?? 0) + (outDeg[id] ?? 0),
    weightedDegree: weightedDeg[id] ?? 0,
    pageRank: pr[id] ?? 0,
    community: community[id] ?? 0,
    isBridge: bridges.has(id),
  }));

  // Top influencers: user nodes ranked by PageRank
  const topInfluencers = metrics
    .filter((m) => m.type === "user")
    .sort((a, b) => b.pageRank - a.pageRank)
    .slice(0, 5)
    .map((m) => m.id);

  // Top tools: tool nodes ranked by weightedDegree
  const topTools = metrics
    .filter((m) => m.type === "tool")
    .sort((a, b) => b.weightedDegree - a.weightedDegree)
    .slice(0, 5)
    .map((m) => m.id);

  // Bridge users
  const bridgeUsers = [...bridges].filter((id) => id.startsWith("user:"));

  // Density: ratio of actual edges to max possible edges (ignoring direction)
  const n = nodeIds.length;
  const maxEdges = n * (n - 1) / 2 || 1;
  const density = edges.length / maxEdges;

  // Connected users: user nodes with ≥1 social edge
  const connectedUserSet = new Set<string>();
  for (const e of edges) {
    if (e.type === "social") { connectedUserSet.add(e.from); connectedUserSet.add(e.to); }
  }
  const connectedUsers = connectedUserSet.size;

  // Orphan tools: tool nodes with 0 usage edges
  const toolsWithUsers = new Set(edges.filter((e) => e.type === "usage").map((e) => e.to));
  const orphanTools = nodes
    .filter((n) => n.type === "tool" && !toolsWithUsers.has(n.id))
    .map((n) => n.id);

  return {
    metrics,
    topInfluencers,
    topTools,
    bridgeUsers,
    communities,
    coUsagePairs: coUsagePairs.slice(0, 10),
    density,
    connectedUsers,
    orphanTools,
  };
}
