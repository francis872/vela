import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { z } from "zod";

const SPRINT_STATUSES = ["active", "completed", "blocked"] as const;
const sprintPatchSchema = z.object({
  sprintId: z.string().optional(),
  itemId: z.string().optional(),
  done: z.boolean().optional(),
  status: z.enum(SPRINT_STATUSES).optional(),
}).refine(
  (value) => (value.itemId ? value.done !== undefined : Boolean(value.sprintId && value.status)),
  "itemId + done or sprintId + status required",
);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(req.url);
  const requestedOwner = searchParams.get("ownerId");
  // Cross-user reads are only allowed for admins; everyone else gets own data.
  const ownerId = session.role === "admin" && requestedOwner ? requestedOwner : session.sub;

  const sprints = await prisma.sprint.findMany({
    where: { ownerId },
    include: { items: { orderBy: { id: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sprints);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

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
  await dispatchDomainEvent("sprint_created", { sprintId: sprint.id, ownerId: sprint.ownerId });
  return NextResponse.json(sprint, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const parsed = sprintPatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sprint update" }, { status: 400 });
  }
  const { sprintId, itemId, done, status } = parsed.data;

  // Toggle a sprint item
  if (itemId !== undefined) {
    const existing = await prisma.sprintItem.findUnique({
      where: { id: itemId },
      include: { sprint: { select: { ownerId: true, ownerName: true, status: true } } },
    });
    if (!existing || (existing.sprint.ownerId !== session.sub && session.role !== "admin")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.sprintItem.update({ where: { id: itemId }, data: { done } });
      const sprint = await tx.sprint.findUnique({ where: { id: existing.sprintId }, include: { items: true } });
      if (!sprint) throw new Error("Sprint not found");

      const shouldComplete = sprint.status !== "completed" && sprint.items.every((item) => item.done);
      const transition = shouldComplete
        ? await tx.sprint.updateMany({
            where: { id: sprint.id, status: { not: "completed" } },
            data: { status: "completed" },
          })
        : { count: 0 };
      const completedNow = transition.count === 1;
      if (completedNow) {
        await tx.founderScore.upsert({
          where: { ownerId: sprint.ownerId },
          create: { ownerId: sprint.ownerId, ownerName: sprint.ownerName, execution: 10 },
          update: { execution: { increment: 10 } },
        });
      }

      return { sprint: { ...sprint, status: completedNow ? "completed" as const : sprint.status }, completedNow };
    });

    if (result.completedNow) {
      await dispatchDomainEvent("sprint_completed", {
        sprintId: result.sprint.id,
        ownerId: result.sprint.ownerId,
        actorId: session.sub,
      });
    }
    return NextResponse.json(result);
  }

  // Update sprint status directly
  if (sprintId && status) {
    const existing = await prisma.sprint.findFirst({
      where:
        session.role === "admin"
          ? { id: sprintId }
          : { id: sprintId, ownerId: session.sub },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sprint = await prisma.sprint.findUnique({ where: { id: existing.id } });
    if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const shouldComplete = status === "completed" && sprint.status !== "completed";
      const transition = shouldComplete
        ? await tx.sprint.updateMany({
            where: { id: sprint.id, status: { not: "completed" } },
            data: { status: "completed" },
          })
        : { count: 0 };
      const completedNow = transition.count === 1;
      const updated = completedNow
        ? await tx.sprint.findUniqueOrThrow({ where: { id: sprint.id } })
        : await tx.sprint.update({ where: { id: sprint.id }, data: { status } });
      if (completedNow) {
        await tx.founderScore.upsert({
          where: { ownerId: sprint.ownerId },
          create: { ownerId: sprint.ownerId, ownerName: sprint.ownerName, execution: 10 },
          update: { execution: { increment: 10 } },
        });
      }
      return { sprint: updated, completedNow };
    });

    if (result.completedNow) {
      await dispatchDomainEvent("sprint_completed", {
        sprintId: result.sprint.id,
        ownerId: result.sprint.ownerId,
        actorId: session.sub,
      });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sprint = await prisma.sprint.findUnique({ where: { id } });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sprint.ownerId !== session.sub && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.sprint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
