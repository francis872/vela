import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);

  const gates = await prisma.gate.findMany({
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return NextResponse.json(gates);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { name, stage, criteria } = body;
  if (!name?.trim() || !stage?.trim()) return NextResponse.json({ error: "name and stage required" }, { status: 400 });

  const gate = await prisma.gate.create({
    data: {
      name: name.trim(),
      stage: stage.trim(),
      criteria: criteria?.trim() ?? "",
      ownerId: auth.session.sub,
      ownerName: auth.session.name,
    },
  });

  return NextResponse.json(gate, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const gate = await prisma.gate.update({
    where: { id },
    data: {
      status,
      ...(status !== "pending" && { decidedAt: new Date() }),
    },
  });

  return NextResponse.json(gate);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await req.json();
  await prisma.gate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
