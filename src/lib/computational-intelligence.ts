import { prisma } from "@/lib/prisma";
import { analyzeGraph } from "@/lib/graph";
import { rankPriorities } from "@/lib/algorithms/priority-engine";
import { propagateRisk } from "@/lib/algorithms/risk-propagation";
import { rankRbfMatches } from "@/lib/algorithms/rbf-similarity";
import { optimizeExecutionPlan } from "@/lib/algorithms/ssa-aco-optimizer";

const baseRisk = (status: string) =>
  status === "blocked" ? 1 : status === "at_risk" ? 0.8 : status === "on_track" ? 0.25 : 0;

export async function computeVelaAlgorithms(ownerId: string) {
  const venture = await prisma.venture.findUnique({ where: { userId: ownerId }, select: { id: true } });

  const [objectives, dependencies, assignments, resourceAllocations, pulse] = await Promise.all([
    prisma.objective.findMany({
      where: { ownerId },
      include: { signals: { select: { id: true } } },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.objectiveDependency.findMany({ where: { ownerId } }),
    venture
      ? prisma.workAssignment.findMany({
          where: { ventureId: venture.id, status: { notIn: ["completed", "closed", "done"] } },
        })
      : Promise.resolve([]),
    venture
      ? prisma.resourceAllocation.findMany({
          where: { ventureId: venture.id, status: "active" },
          include: { resource: true },
        })
      : Promise.resolve([]),
    prisma.venturePulseSnapshot.findMany({
      where: { ownerId },
      orderBy: { capturedAt: "desc" },
      take: 30,
    }),
  ]);

  const nodes = objectives.map((objective) => ({
    id: objective.id,
    label: objective.title,
    status: objective.status as "on_track" | "at_risk" | "blocked" | "completed",
    priority: objective.priority,
  }));
  const edges = dependencies.map((dependency) => ({
    from: dependency.objectiveId,
    to: dependency.dependsOnId,
  }));
  const graph = analyzeGraph(nodes, edges);
  const risk = propagateRisk(
    objectives.map((objective) => ({ id: objective.id, baseRisk: baseRisk(objective.status) })),
    edges,
  );

  const dependencyMap = new Map<string, string[]>();
  for (const objective of objectives) dependencyMap.set(objective.id, []);
  for (const edge of edges) dependencyMap.get(edge.from)?.push(edge.to);

  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
  const ranked = rankPriorities(
    objectives.map((objective) => {
      const assignment = assignments.find(
        (item) => item.workType === "objective" && item.workId === objective.id,
      );
      const allocations = resourceAllocations.filter(
        (allocation) => allocation.workType === "objective" && allocation.workId === objective.id,
      );
      const resourceReady = allocations.length
        ? allocations.every((allocation) => allocation.resource.status === "available")
        : null;

      return {
        id: objective.id,
        title: objective.title,
        status: objective.status as "on_track" | "at_risk" | "blocked" | "completed",
        priority: objective.priority,
        dueDate: objective.dueDate?.toISOString() ?? null,
        signalCount: objective.signals.length,
        downstreamImpact: graph.blockingFactor[objective.id] ?? 0,
        unmetDependencies: (dependencyMap.get(objective.id) ?? []).filter(
          (id) => objectiveById.get(id)?.status !== "completed",
        ).length,
        criticalPath: graph.criticalPath.includes(objective.id),
        assignedLoad: assignment?.weight ?? null,
        resourceReady,
      };
    }),
  );

  const activeMemberLoad = assignments
    .filter((assignment) => !["completed", "closed", "done"].includes(assignment.status))
    .reduce((sum, assignment) => sum + Math.max(1, assignment.weight), 0);
  const planningCapacity = Math.max(1, Math.min(20, activeMemberLoad || 5));

  const plan = optimizeExecutionPlan(
    ranked.map((candidate) => ({
      id: candidate.id,
      utility: candidate.score,
      cost: Math.max(
        1,
        assignments.find(
          (assignment) => assignment.workType === "objective" && assignment.workId === candidate.id,
        )?.weight ?? 1,
      ),
      risk: risk.nodeRisk[candidate.id] ?? baseRisk(candidate.status),
      executable: candidate.executable,
      dependencies: dependencyMap.get(candidate.id) ?? [],
    })),
    planningCapacity,
  );

  const latest = pulse[0];
  const history = pulse.slice(1);
  const target = latest
    ? {
        velocity: latest.velocity,
        validation: latest.validation,
        risk: latest.risk,
        readiness: latest.readiness,
        sprintCompletion: latest.sprintCompletion,
      }
    : null;

  const similarity = target
    ? rankRbfMatches(
        target,
        history,
        (point) => ({
          velocity: point.velocity,
          validation: point.validation,
          risk: point.risk,
          readiness: point.readiness,
          sprintCompletion: point.sprintCompletion,
        }),
        { minFeatures: 2 },
      )
        .slice(0, 5)
        .map((match) => ({
          snapshotId: match.item.id,
          capturedAt: match.item.capturedAt.toISOString(),
          similarity: match.similarity,
          distance: match.distance,
          comparedFeatures: match.comparedFeatures,
        }))
    : [];

  const selectedObjectives = plan.selected
    .map((id) => ranked.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      score: candidate.score,
      reasons: candidate.reasons,
    }));

  const deferredObjectives = ranked
    .filter((candidate) => !plan.selected.includes(candidate.id))
    .slice(0, 5)
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      score: candidate.score,
      executable: candidate.executable,
      reasons: candidate.reasons,
    }));

  return {
    generatedAt: new Date().toISOString(),
    priority: {
      algorithm: "VELA_PRIORITY_ENGINE_V1",
      ranked,
      top: ranked[0] ?? null,
    },
    risk: {
      algorithm: "GRAPH_RISK_PROPAGATION_V1",
      ...risk,
    },
    similarity: {
      algorithm: "RBF_STATE_SIMILARITY_V1",
      matches: similarity,
      closest: similarity[0] ?? null,
    },
    optimization: {
      algorithm: "SSA_ACO_EXECUTION_OPTIMIZER_V1",
      capacity: planningCapacity,
      plan,
      selectedObjectives,
      deferredObjectives,
    },
  };
}
