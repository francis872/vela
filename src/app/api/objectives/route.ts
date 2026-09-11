import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";

const OBJECTIVE_STATUSES = ["on_track", "at_risk", "blocked", "completed"] as const;
type ObjectiveStatusValue = (typeof OBJECTIVE_STATUSES)[number];

function isValidStatus(value: unknown): value is ObjectiveStatusValue {
  return (
    typeof value === "string" &&
    (OBJECTIVE_STATUSES as readonly string[]).includes(value)
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
  const statusParam = url.searchParams.get("status");

  const objectives = await prisma.objective.findMany({
    where: {
      ownerId: auth.session.sub,
      ...(isValidStatus(statusParam) ? { status: statusParam } : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: { _count: { select: { signals: true } } },
  });

  return NextResponse.json(objectives);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { title, description, status, priority, dueDate, cycleId } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (status !== undefined && !isValidStatus(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  // Venture as source of truth: attach the owner's venture when it exists.
  const venture = await prisma.venture.findUnique({
    where: { userId: auth.session.sub },
    select: { id: true },
  });

  const obj = await prisma.objective.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      status: status ?? "on_track",
      priority: Number.isInteger(priority) ? priority : 1,
      dueDate: dueDate ? new Date(dueDate) : null,
      cycleId: cycleId ?? null,
      ventureId: venture?.id ?? null,
      ownerId: auth.session.sub,
      ownerName: auth.session.name,
    },
  });

  await dispatchDomainEvent("objective_created", { objectiveId: obj.id, ownerId: obj.ownerId });

  return NextResponse.json(obj, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (updates.status !== undefined && !isValidStatus(updates.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const existing = await prisma.objective.findFirst({
    where: { id, ownerId: auth.session.sub },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const obj = await prisma.objective.update({
    where: { id: existing.id },
    data: {
      ...(updates.title && { title: String(updates.title).trim() }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status && { status: updates.status }),
      ...(updates.priority !== undefined && Number.isInteger(updates.priority) && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
    },
  });

  await dispatchDomainEvent("objective_updated", { objectiveId: obj.id, ownerId: auth.session.sub });

  return NextResponse.json(obj);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.objective.findFirst({
    where: { id, ownerId: auth.session.sub },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.objective.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
