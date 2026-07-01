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
  const ownerId = searchParams.get("ownerId") ?? session.sub;

  const sprints = await prisma.sprint.findMany({
    where: { ownerId },
    include: { items: { orderBy: { id: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sprints);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, weekStart, commitments } = body;
  if (!title || !weekStart || !Array.isArray(commitments) || commitments.length === 0) {
    return NextResponse.json({ error: "title, weekStart, commitments required" }, { status: 400 });
  }

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const sprint = await prisma.sprint.create({
    data: {
      title,
      weekStart: start,
      weekEnd: end,
      ownerId: session.sub,
      ownerName: session.name,
      items: {
        create: commitments.map((c: string) => ({ title: c, done: false })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json(sprint, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sprintId, itemId, done, status } = body;

  // Toggle a sprint item
  if (itemId !== undefined) {
    const item = await prisma.sprintItem.update({
      where: { id: itemId },
      data: { done },
    });

    // Auto-complete sprint if all items done
    const sprint = await prisma.sprint.findUnique({ where: { id: item.sprintId }, include: { items: true } });
    if (sprint && sprint.items.every((i) => i.done)) {
      await prisma.sprint.update({ where: { id: sprint.id }, data: { status: "completed" } });
      // Award execution score
      await prisma.founderScore.upsert({
        where: { ownerId: session.sub },
        create: { ownerId: session.sub, ownerName: session.name, execution: 10 },
        update: { execution: { increment: 10 } },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Update sprint status directly
  if (sprintId && status) {
    await prisma.sprint.update({ where: { id: sprintId }, data: { status } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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

  const sprint = await prisma.sprint.findUnique({ where: { id } });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sprint.ownerId !== session.sub && session.role === "operador") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.sprint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
