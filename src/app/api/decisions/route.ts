import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const decisions = await prisma.decision.findMany({
    where: { ownerId: session.sub },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(decisions);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const body = await req.json();
  const { title, context, choice, rationale, expectedOutcome, evidence, reviewAt } = body;
  if (!title || !context || !choice || !rationale) {
    return NextResponse.json({ error: "title, context, choice, rationale required" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: {
      title, context, choice, rationale,
      expectedOutcome: expectedOutcome?.trim() || null,
      evidence: Array.isArray(evidence) ? evidence.map((item: unknown) => String(item).trim()).filter(Boolean) : [],
      reviewAt: reviewAt ? new Date(reviewAt) : null,
      ownerId: session.sub, ownerName: session.name,
    },
  });

  // Award collaboration score
  await prisma.founderScore.upsert({
    where: { ownerId: session.sub },
    create: { ownerId: session.sub, ownerName: session.name, collaboration: 5 },
    update: { collaboration: { increment: 5 } },
  });

  await dispatchDomainEvent("decision_created", { decisionId: decision.id, ownerId: session.sub });
  return NextResponse.json(decision, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const body = await req.json();
  const { id, outcome, outcomeStatus, consolidateLearning } = body;
  if (!id || !outcome) return NextResponse.json({ error: "id and outcome required" }, { status: 400 });
  if (outcomeStatus && !["SUCCESS", "PARTIAL", "NO_IMPROVEMENT"].includes(outcomeStatus)) {
    return NextResponse.json({ error: "invalid outcomeStatus" }, { status: 400 });
  }

  const decision = await prisma.decision.findFirst({
    where: { id, ownerId: session.sub },
  });
  if (!decision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Award results score when outcome is recorded
  await prisma.founderScore.upsert({
    where: { ownerId: session.sub },
    create: { ownerId: session.sub, ownerName: session.name, results: 5 },
    update: { results: { increment: 5 } },
  });

  const updated = await prisma.decision.update({
    where: { id: decision.id },
    data: {
      outcome,
      outcomeStatus: outcomeStatus || decision.outcomeStatus,
      learnedAt: consolidateLearning ? new Date() : decision.learnedAt,
    },
  });
  await dispatchDomainEvent("decision_outcome_recorded", { decisionId: updated.id, ownerId: session.sub });
  if (consolidateLearning && updated.outcomeStatus) {
    await dispatchDomainEvent("decision_learning_consolidated", { decisionId: updated.id, ownerId: session.sub, outcomeStatus: updated.outcomeStatus });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const decision = await prisma.decision.findFirst({
    where: { id, ownerId: session.sub },
  });
  if (!decision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.decision.delete({ where: { id: decision.id } });
  return NextResponse.json({ ok: true });
}
