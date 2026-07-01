import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, context, choice, rationale } = body;
  if (!title || !context || !choice || !rationale) {
    return NextResponse.json({ error: "title, context, choice, rationale required" }, { status: 400 });
  }

  const decision = await prisma.decision.create({
    data: { title, context, choice, rationale, ownerId: session.sub, ownerName: session.name },
  });

  // Award collaboration score
  await prisma.founderScore.upsert({
    where: { ownerId: session.sub },
    create: { ownerId: session.sub, ownerName: session.name, collaboration: 5 },
    update: { collaboration: { increment: 5 } },
  });

  return NextResponse.json(decision, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, outcome } = body;
  if (!id || !outcome) return NextResponse.json({ error: "id and outcome required" }, { status: 400 });

  const decision = await prisma.decision.findUnique({ where: { id } });
  if (!decision || decision.ownerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Award results score when outcome is recorded
  await prisma.founderScore.upsert({
    where: { ownerId: session.sub },
    create: { ownerId: session.sub, ownerName: session.name, results: 5 },
    update: { results: { increment: 5 } },
  });

  const updated = await prisma.decision.update({ where: { id }, data: { outcome } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const decision = await prisma.decision.findUnique({ where: { id } });
  if (!decision || decision.ownerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.decision.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
