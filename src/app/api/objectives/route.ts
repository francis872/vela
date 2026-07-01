import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const status = url.searchParams.get("status");

  const where = status ? { status: status as "on_track" | "at_risk" | "blocked" | "completed" } : {};

  const objectives = await prisma.objective.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: { _count: { select: { signals: true } } },
  });

  return NextResponse.json(objectives);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { title, description, status, priority, dueDate, cycleId } = body;

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const obj = await prisma.objective.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      status: status ?? "on_track",
      priority: priority ?? 1,
      dueDate: dueDate ? new Date(dueDate) : null,
      cycleId: cycleId ?? null,
      ownerId: auth.session.sub,
      ownerName: auth.session.name,
    },
  });

  return NextResponse.json(obj, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const obj = await prisma.objective.update({
    where: { id },
    data: {
      ...(updates.title && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status && { status: updates.status }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
    },
  });

  return NextResponse.json(obj);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.objective.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
