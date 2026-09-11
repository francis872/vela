import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const GATE_STATUSES = ["pending", "passed", "failed"] as const;
type GateStatusValue = (typeof GATE_STATUSES)[number];

function isValidStatus(value: unknown): value is GateStatusValue {
  return (
    typeof value === "string" &&
    (GATE_STATUSES as readonly string[]).includes(value)
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100);

  const gates = await prisma.gate.findMany({
    where: { ownerId: auth.session.sub },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return NextResponse.json(gates);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { name, stage, criteria } = body;
  if (!name?.trim() || !stage?.trim()) {
    return NextResponse.json({ error: "name and stage required" }, { status: 400 });
  }

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
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, status } = body;
  if (!id || !isValidStatus(status)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }

  const existing = await prisma.gate.findFirst({
    where: { id, ownerId: auth.session.sub },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = await prisma.gate.update({
    where: { id: existing.id },
    data: {
      status,
      ...(status !== "pending" && { decidedAt: new Date() }),
    },
  });

  return NextResponse.json(gate);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.gate.findFirst({
    where:
      auth.session.role === "admin"
        ? { id }
        : { id, ownerId: auth.session.sub },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.gate.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
