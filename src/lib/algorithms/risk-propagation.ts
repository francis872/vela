export type RiskNode = {
  id: string;
  baseRisk: number; // 0..1
};

export type RiskEdge = {
  from: string; // dependent objective
  to: string;   // prerequisite objective
};

export type RiskPropagationResult = {
  nodeRisk: Record<string, number>;
  contributions: Record<string, { sourceId: string; contribution: number; depth: number }[]>;
  topSystemicRisks: { id: string; propagatedRisk: number; downstreamAffected: number }[];
};

export function propagateRisk(
  nodes: RiskNode[],
  edges: RiskEdge[],
  options?: { attenuation?: number; maxDepth?: number },
): RiskPropagationResult {
  const attenuation = Math.max(0, Math.min(1, options?.attenuation ?? 0.65));
  const maxDepth = Math.max(1, Math.floor(options?.maxDepth ?? 8));
  const ids = new Set(nodes.map((n) => n.id));
  const successors = new Map<string, string[]>();
  for (const id of ids) successors.set(id, []);
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    successors.get(edge.to)?.push(edge.from);
  }

  const base = new Map(nodes.map((n) => [n.id, Math.max(0, Math.min(1, n.baseRisk))]));
  const combined = new Map(nodes.map((n) => [n.id, base.get(n.id) ?? 0]));
  const contributions: RiskPropagationResult["contributions"] = Object.fromEntries(nodes.map((n) => [n.id, []]));

  for (const source of nodes) {
    const sourceRisk = base.get(source.id) ?? 0;
    if (sourceRisk <= 0) continue;
    const queue: { id: string; depth: number; pathFactor: number }[] = (successors.get(source.id) ?? []).map((id) => ({
      id, depth: 1, pathFactor: attenuation,
    }));
    const bestFactor = new Map<string, number>();

    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth > maxDepth) continue;
      if ((bestFactor.get(current.id) ?? -1) >= current.pathFactor) continue;
      bestFactor.set(current.id, current.pathFactor);

      const contribution = sourceRisk * current.pathFactor;
      const previous = combined.get(current.id) ?? 0;
      // Independent-risk union: 1 - (1-a)(1-b)
      combined.set(current.id, 1 - (1 - previous) * (1 - contribution));
      contributions[current.id].push({
        sourceId: source.id,
        contribution: Math.round(contribution * 10000) / 10000,
        depth: current.depth,
      });

      for (const next of successors.get(current.id) ?? []) {
        queue.push({ id: next, depth: current.depth + 1, pathFactor: current.pathFactor * attenuation });
      }
    }
  }

  const downstreamCount = (id: string) => {
    const seen = new Set<string>();
    const queue = [...(successors.get(id) ?? [])];
    while (queue.length) {
      const next = queue.shift()!;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(...(successors.get(next) ?? []));
    }
    return seen.size;
  };

  const nodeRisk = Object.fromEntries(
    [...combined.entries()].map(([id, risk]) => [id, Math.round(risk * 10000) / 10000]),
  );
  const topSystemicRisks = nodes
    .map((node) => ({ id: node.id, propagatedRisk: nodeRisk[node.id] ?? 0, downstreamAffected: downstreamCount(node.id) }))
    .sort((a, b) => b.propagatedRisk - a.propagatedRisk || b.downstreamAffected - a.downstreamAffected);

  return { nodeRisk, contributions, topSystemicRisks };
}
