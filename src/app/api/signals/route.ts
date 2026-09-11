import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";

const SIGNAL_TYPES = ["experiment", "interview", "metric", "insight"] as const;
type SignalTypeValue = (typeof SIGNAL_TYPES)[number];

function isValidType(value: unknown): value is SignalTypeValue {
  return (
    typeof value === "string" &&
    (SIGNAL_TYPES as readonly string[]).includes(value)
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
  const typeParam = url.searchParams.get("type");
  const objectiveId = url.searchParams.get("objectiveId");

  const signals = await prisma.signal.findMany({
    where: {
      ownerId: auth.session.sub,
      ...(isValidType(typeParam) ? { type: typeParam } : {}),
      ...(objectiveId ? { objectiveId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(signals);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { type, title, result, hypothesis, learning, objectiveId } = body;

  if (!isValidType(type) || !title?.trim()) {
    return NextResponse.json({ error: "valid type and title required" }, { status: 400 });
  }

  if (objectiveId) {
    const objective = await prisma.objective.findFirst({
      where: { id: objectiveId, ownerId: auth.session.sub },
      select: { id: true },
    });
    if (!objective) {
      return NextResponse.json({ error: "objective not found" }, { status: 404 });
    }
  }

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

  if (type === "interview" || type === "metric") {
    await dispatchDomainEvent(type === "interview" ? "interview_created" : "metric_recorded", {
      signalId: signal.id,
      ownerId: signal.ownerId,
      objectiveId: signal.objectiveId,
    });
  }

  return NextResponse.json(signal, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.signal.findFirst({
    where:
      auth.session.role === "admin"
        ? { id }
        : { id, ownerId: auth.session.sub },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.signal.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
