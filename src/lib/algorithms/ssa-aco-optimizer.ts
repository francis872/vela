export type OptimizationCandidate = {
  id: string;
  utility: number; // 0..100
  cost: number;    // capacity units
  risk: number;    // 0..1
  executable: boolean;
  dependencies: string[];
};

export type OptimizationPlan = {
  selected: string[];
  score: number;
  usedCapacity: number;
  totalUtility: number;
  totalRisk: number;
  trace: string[];
};

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function evaluate(selected: Set<string>, byId: Map<string, OptimizationCandidate>, capacity: number, riskPenalty = 20, capacityPenalty = 0.25) {
  let used = 0, utility = 0, risk = 0;
  for (const id of selected) {
    const item = byId.get(id);
    if (!item || !item.executable) return { valid: false, score: -Infinity, used, utility, risk };
    used += Math.max(1, item.cost);
    utility += item.utility;
    risk += item.risk;
    if (item.dependencies.some((dependency) => byId.has(dependency) && !selected.has(dependency))) {
      return { valid: false, score: -Infinity, used, utility, risk };
    }
  }
  if (used > capacity) return { valid: false, score: -Infinity, used, utility, risk };
  const score = utility - risk * riskPenalty - Math.max(0, capacity - used) * capacityPenalty;
  return { valid: true, score, used, utility, risk };
}

export function optimizeExecutionPlan(
  candidates: OptimizationCandidate[],
  capacity: number,
  options?: { iterations?: number; ants?: number; seed?: number; riskPenalty?: number; capacityPenalty?: number; evaporation?: number; exploration?: number },
): OptimizationPlan {
  const usable = candidates.filter((c) => c.executable);
  const byId = new Map(usable.map((c) => [c.id, c]));
  if (!usable.length || capacity <= 0) return { selected: [], score: 0, usedCapacity: 0, totalUtility: 0, totalRisk: 0, trace: ["insufficient executable capacity"] };

  const iterations = Math.max(4, options?.iterations ?? 18);
  const riskPenalty = Math.max(0, options?.riskPenalty ?? 20);
  const capacityPenalty = Math.max(0, options?.capacityPenalty ?? 0.25);
  const evaporation = Math.max(0.5, Math.min(0.99, options?.evaporation ?? 0.88));
  const exploration = Math.max(0, Math.min(0.6, options?.exploration ?? 0.18));
  const ants = Math.max(4, options?.ants ?? 12);
  const random = seeded(options?.seed ?? 872);
  const pheromone = new Map(usable.map((c) => [c.id, 1]));
  let best = new Set<string>();
  let bestEval = evaluate(best, byId, capacity, riskPenalty, capacityPenalty);
  const trace: string[] = [];

  for (let iteration = 0; iteration < iterations; iteration++) {
    // SSA-style producer: exploit the strongest utility/risk/capacity candidates.
    const producerOrder = [...usable].sort((a, b) =>
      (b.utility / Math.max(1, b.cost) - b.risk * 10) - (a.utility / Math.max(1, a.cost) - a.risk * 10));
    const producer = new Set<string>();
    for (const item of producerOrder) {
      const trial = new Set(producer); trial.add(item.id);
      if (evaluate(trial, byId, capacity, riskPenalty, capacityPenalty).valid) producer.add(item.id);
    }
    const producerEval = evaluate(producer, byId, capacity, riskPenalty, capacityPenalty);
    if (producerEval.score > bestEval.score) { best = producer; bestEval = producerEval; }

    // ACO-style scouts/followers: pheromone + heuristic search.
    for (let ant = 0; ant < ants; ant++) {
      const selected = new Set<string>();
      const remaining = [...usable];
      while (remaining.length) {
        const feasible = remaining.filter((item) => {
          const trial = new Set(selected); trial.add(item.id);
          return evaluate(trial, byId, capacity, riskPenalty, capacityPenalty).valid;
        });
        if (!feasible.length) break;
        const weighted = feasible.map((item) => {
          const heuristic = Math.max(0.01, item.utility / Math.max(1, item.cost) * (1 - item.risk * 0.5));
          return { item, weight: (pheromone.get(item.id) ?? 1) * heuristic };
        });
        const total = weighted.reduce((s, x) => s + x.weight, 0);
        let pick = random() * total;
        let chosen = weighted[weighted.length - 1].item;
        for (const entry of weighted) { pick -= entry.weight; if (pick <= 0) { chosen = entry.item; break; } }
        selected.add(chosen.id);
        remaining.splice(remaining.findIndex((item) => item.id === chosen.id), 1);
        if (random() < exploration) break;
      }
      const result = evaluate(selected, byId, capacity, riskPenalty, capacityPenalty);
      if (result.score > bestEval.score) { best = selected; bestEval = result; }
    }

    for (const item of usable) pheromone.set(item.id, Math.max(0.1, (pheromone.get(item.id) ?? 1) * evaporation));
    if (bestEval.valid && bestEval.score > 0) {
      for (const id of best) pheromone.set(id, (pheromone.get(id) ?? 1) + bestEval.score / 100);
    }
    if (iteration === 0 || iteration === iterations - 1) trace.push(`iteration:${iteration + 1}:best=${Math.round(bestEval.score * 100) / 100}`);
  }

  return {
    selected: [...best],
    score: Math.round(Math.max(0, bestEval.score) * 100) / 100,
    usedCapacity: bestEval.used,
    totalUtility: Math.round(bestEval.utility * 100) / 100,
    totalRisk: Math.round(bestEval.risk * 1000) / 1000,
    trace,
  };
}
