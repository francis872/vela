import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const type = url.searchParams.get("type");
  const objectiveId = url.searchParams.get("objectiveId");

  const signals = await prisma.signal.findMany({
    where: {
      ...(type && { type: type as "experiment" | "interview" | "metric" | "insight" }),
      ...(objectiveId && { objectiveId }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(signals);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { type, title, result, hypothesis, learning, objectiveId } = body;

  if (!type || !title?.trim()) return NextResponse.json({ error: "type and title required" }, { status: 400 });

  const signal = await prisma.signal.create({
    data: {
      type,
      title: title.trim(),
      result: result?.trim() ?? null,
      hypothesis: hypothesis?.trim() ?? null,
      learning: learning?.trim() ?? null,
      objectiveId: objectiveId ?? null,
      ownerId: auth.session.sub,
      ownerName: auth.session.name,
    },
  });

  return NextResponse.json(signal, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.signal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
