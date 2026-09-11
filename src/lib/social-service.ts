import { prisma } from "@/lib/prisma";

/**
 * SocialService — Follow / Connection / Block graph.
 *
 * Rules enforced here (single source of truth):
 * - Follow is unidirectional; no self-follow; no duplicates.
 * - Connection is bilateral; requires a request + acceptance (transaction).
 * - A blocked user cannot follow, request, or connect.
 * - Accepting a request creates the Connection in the same transaction.
 */

export type SocialError = { status: number; error: string };

function err(status: number, error: string): SocialError {
  return { status, error };
}

async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

/* ── Follow ─────────────────────────────────────────────────────────────── */

export async function followUser(meId: string, targetId: string): Promise<{ ok: true } | SocialError> {
  if (meId === targetId) return err(400, "No puedes seguirte a ti mismo");
  const target = await prisma.user.findFirst({ where: { id: targetId, active: true }, select: { id: true } });
  if (!target) return err(404, "Usuario no encontrado");
  if (await isBlockedEitherWay(meId, targetId)) return err(403, "No puedes seguir a este usuario");

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: meId, followingId: targetId } },
    create: { followerId: meId, followingId: targetId },
    update: {},
  });
  return { ok: true };
}

export async function unfollowUser(meId: string, targetId: string) {
  await prisma.follow.deleteMany({ where: { followerId: meId, followingId: targetId } });
  return { ok: true };
}

export async function getFollowStats(userId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

/* ── Connection (bilateral) ─────────────────────────────────────────────── */

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function requestConnection(meId: string, targetId: string, message?: string): Promise<{ ok: true } | SocialError> {
  if (meId === targetId) return err(400, "No puedes conectar contigo mismo");
  const target = await prisma.user.findFirst({ where: { id: targetId, active: true }, select: { id: true } });
  if (!target) return err(404, "Usuario no encontrado");
  if (await isBlockedEitherWay(meId, targetId)) return err(403, "No puedes conectar con este usuario");

  const [a, b] = orderedPair(meId, targetId);
  const existing = await prisma.connection.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (existing) return err(409, "Ya estáis conectados");

  const pending = await prisma.connectionRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: meId, toUserId: targetId } },
  });
  if (pending && pending.status === "pending") return err(409, "Ya existe una solicitud pendiente");

  await prisma.connectionRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId: meId, toUserId: targetId } },
    create: { fromUserId: meId, toUserId: targetId, message: message ?? null },
    update: { status: "pending", message: message ?? null, respondedAt: null },
  });
  return { ok: true };
}

export async function respondConnection(meId: string, requestId: string, accept: boolean): Promise<{ ok: true } | SocialError> {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });
  if (!request) return err(404, "Solicitud no encontrada");
  // Only the RECIPIENT can accept/decline.
  if (request.toUserId !== meId) return err(403, "No autorizado");
  if (request.status !== "pending") return err(409, "La solicitud ya fue respondida");

  if (!accept) {
    await prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: "declined", respondedAt: new Date() },
    });
    return { ok: true };
  }

  // Accept: request → accepted + create bilateral Connection, atomically.
  const [a, b] = orderedPair(request.fromUserId, request.toUserId);
  await prisma.$transaction([
    prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: "accepted", respondedAt: new Date() },
    }),
    prisma.connection.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      create: { userAId: a, userBId: b },
      update: {},
    }),
  ]);
  return { ok: true };
}

export async function removeConnection(meId: string, otherId: string) {
  const [a, b] = orderedPair(meId, otherId);
  await prisma.connection.deleteMany({ where: { userAId: a, userBId: b } });
  return { ok: true };
}

export async function listConnections(meId: string) {
  const connections = await prisma.connection.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    orderBy: { createdAt: "desc" },
    include: {
      userA: { select: { id: true, name: true, role: true, headline: true, position: true } },
      userB: { select: { id: true, name: true, role: true, headline: true, position: true } },
    },
  });
  return connections.map((c) => (c.userAId === meId ? c.userB : c.userA));
}

export async function listPendingRequests(meId: string) {
  const [received, sent] = await Promise.all([
    prisma.connectionRequest.findMany({
      where: { toUserId: meId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { fromUser: { select: { id: true, name: true, role: true, headline: true, position: true } } },
    }),
    prisma.connectionRequest.findMany({
      where: { fromUserId: meId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { toUser: { select: { id: true, name: true, role: true, headline: true, position: true } } },
    }),
  ]);
  return { received, sent };
}

/* ── Block ──────────────────────────────────────────────────────────────── */

export async function blockUser(meId: string, targetId: string): Promise<{ ok: true } | SocialError> {
  if (meId === targetId) return err(400, "No puedes bloquearte a ti mismo");
  const target = await prisma.user.findFirst({ where: { id: targetId }, select: { id: true } });
  if (!target) return err(404, "Usuario no encontrado");

  const [a, b] = orderedPair(meId, targetId);
  await prisma.$transaction([
    prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: targetId } },
      create: { blockerId: meId, blockedId: targetId },
      update: {},
    }),
    // Blocking severs follow + connection in both directions.
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: meId, followingId: targetId },
          { followerId: targetId, followingId: meId },
        ],
      },
    }),
    prisma.connection.deleteMany({ where: { userAId: a, userBId: b } }),
    prisma.connectionRequest.updateMany({
      where: {
        status: "pending",
        OR: [
          { fromUserId: meId, toUserId: targetId },
          { fromUserId: targetId, toUserId: meId },
        ],
      },
      data: { status: "blocked", respondedAt: new Date() },
    }),
  ]);
  return { ok: true };
}

export async function unblockUser(meId: string, targetId: string): Promise<{ ok: true }> {
  await prisma.userBlock.deleteMany({ where: { blockerId: meId, blockedId: targetId } });
  return { ok: true };
}
