import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeGraph, GraphNode, GraphEdge } from "@/lib/graph";

export const dynamic = "force-dynamic";

/** GET /api/objectives/graph — returns full graph + analysis */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [objectives, deps] = await Promise.all([
    prisma.objective.findMany({ where: { ownerId: session.sub }, orderBy: { priority: "asc" } }),
    prisma.objectiveDependency.findMany({ where: { ownerId: session.sub } }),
  ]);

  const nodes: GraphNode[] = objectives.map((o) => ({
    id: o.id,
    label: o.title,
    status: o.status,
    priority: o.priority,
  }));

  const edges: GraphEdge[] = deps.map((d) => ({
    from: d.objectiveId,
    to: d.dependsOnId,
  }));

  const analysis = analyzeGraph(nodes, edges);

  return NextResponse.json({ nodes, edges, analysis });
}

/** POST /api/objectives/graph — add dependency edge */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { objectiveId, dependsOnId } = await req.json();
  if (!objectiveId || !dependsOnId) {
    return NextResponse.json({ error: "objectiveId and dependsOnId required" }, { status: 400 });
  }
  if (objectiveId === dependsOnId) {
    return NextResponse.json({ error: "An objective cannot depend on itself" }, { status: 400 });
  }

  // Verify both objectives belong to this user
  const [obj, dep] = await Promise.all([
    prisma.objective.findFirst({ where: { id: objectiveId, ownerId: session.sub } }),
    prisma.objective.findFirst({ where: { id: dependsOnId, ownerId: session.sub } }),
  ]);
  if (!obj || !dep) return NextResponse.json({ error: "Objective not found" }, { status: 404 });

  // Check for cycle before inserting: would adding this edge create a cycle?
  const existingDeps = await prisma.objectiveDependency.findMany({ where: { ownerId: session.sub } });
  const allObjectives = await prisma.objective.findMany({ where: { ownerId: session.sub } });

  const nodes: GraphNode[] = allObjectives.map((o) => ({
    id: o.id, label: o.title, status: o.status, priority: o.priority,
  }));
  const edges: GraphEdge[] = [
    ...existingDeps.map((d) => ({ from: d.objectiveId, to: d.dependsOnId })),
    { from: objectiveId, to: dependsOnId },
  ];

  const { hasCycle } = analyzeGraph(nodes, edges);
  if (hasCycle) {
    return NextResponse.json({ error: "This dependency would create a cycle" }, { status: 422 });
  }

  const dependency = await prisma.objectiveDependency.create({
    data: { objectiveId, dependsOnId, ownerId: session.sub },
  });

  return NextResponse.json(dependency, { status: 201 });
}

/** DELETE /api/objectives/graph?objectiveId=X&dependsOnId=Y */
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const objectiveId = searchParams.get("objectiveId");
  const dependsOnId = searchParams.get("dependsOnId");
  if (!objectiveId || !dependsOnId) {
    return NextResponse.json({ error: "objectiveId and dependsOnId required" }, { status: 400 });
  }

  await prisma.objectiveDependency.deleteMany({
    where: { objectiveId, dependsOnId, ownerId: session.sub },
  });

  return NextResponse.json({ ok: true });
}
