import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/connect?userId=X
 * Returns all connections for the current user.
 *
 * POST /api/platform/connect
 * Body: { toUserId, type? }
 * Creates a connection from current user → toUserId.
 *
 * DELETE /api/platform/connect?toUserId=X
 * Removes the connection current user → toUserId.
 */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.userConnection.findMany({
    where: { OR: [{ fromUserId: session.sub }, { toUserId: session.sub }] },
    include: {
      fromUser: { select: { id: true, name: true, role: true } },
      toUser:   { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Also return all users to power the "connect" form
  const allUsers = await prisma.user.findMany({
    where: { active: true, id: { not: session.sub } },
    select: { id: true, name: true, role: true, position: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ connections, allUsers });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toUserId, type = "follow" } = await req.json();
  if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });
  if (toUserId === session.sub) return NextResponse.json({ error: "Cannot connect to yourself" }, { status: 400 });

  const validTypes = ["follow", "collaborate", "mentor"];
  if (!validTypes.includes(type)) return NextResponse.json({ error: "Invalid connection type" }, { status: 400 });

  // Verify target user exists
  const target = await prisma.user.findFirst({ where: { id: toUserId, active: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const connection = await prisma.userConnection.upsert({
    where: { fromUserId_toUserId: { fromUserId: session.sub, toUserId } },
    create: { fromUserId: session.sub, toUserId, type },
    update: { type },
  });

  return NextResponse.json(connection, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const toUserId = searchParams.get("toUserId");
  if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });

  await prisma.userConnection.deleteMany({
    where: { fromUserId: session.sub, toUserId },
  });

  return NextResponse.json({ ok: true });
}
