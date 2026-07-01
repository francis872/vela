import { prisma } from "@/lib/prisma";

export async function createAuthSession(params: {
  userId: string;
  tokenHash: string;
  ip?: string;
  userAgent?: string;
}) {
  return prisma.authSession.create({
    data: {
      userId: params.userId,
      tokenHash: params.tokenHash,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

export async function touchAuthSession(tokenHash: string) {
  return prisma.authSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { lastSeenAt: new Date() },
  });
}

export async function revokeAuthSession(tokenHash: string) {
  return prisma.authSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllAuthSessions(userId: string) {
  return prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listActiveAuthSessions(userId: string) {
  return prisma.authSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function writeAccessLog(params: {
  userId?: string;
  email?: string;
  success: boolean;
  reason?: string;
  ip?: string;
  userAgent?: string;
}) {
  return prisma.accessLog.create({
    data: {
      userId: params.userId,
      email: params.email,
      success: params.success,
      reason: params.reason,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

export async function listAccessLogs(userId: string, limit = 20) {
  return prisma.accessLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
