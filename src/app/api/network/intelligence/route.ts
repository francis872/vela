import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { synthesizeNetworkIntelligence } from "@/lib/network-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;

  const [users, connections, blockedObjective, signalGroups, pendingCapitalGates, relayBlockers] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, id: { not: ownerId } },
      select: {
        id: true,
        name: true,
        role: true,
        position: true,
        headline: true,
        availability: true,
        userSkills: { include: { skill: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.userConnection.findMany({
      where: { OR: [{ fromUserId: ownerId }, { toUserId: ownerId }] },
      select: { fromUserId: true, toUserId: true },
    }),
    prisma.objective.findFirst({
      where: { ownerId, status: "blocked" },
      select: { id: true, title: true },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.signal.groupBy({
      by: ["type"],
      where: { ownerId },
      _count: { id: true },
    }),
    prisma.gate.count({ where: { ownerId, status: "pending" } }),
    prisma.thread.count({ where: { authorId: ownerId, category: "blocker" } }),
  ]);

  const connectedIds = new Set(connections.flatMap((connection) => [connection.fromUserId, connection.toUserId]));
  const signalCount = (type: string) => signalGroups.find((group) => group.type === type)?._count.id ?? 0;

  const intelligence = synthesizeNetworkIntelligence({
    candidates: users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      position: user.position,
      headline: user.headline,
      availability: user.availability,
      skills: user.userSkills.map((entry) => entry.skill.name),
      alreadyConnected: connectedIds.has(user.id),
    })),
    blockedObjective,
    interviews: signalCount("interview"),
    metrics: signalCount("metric"),
    pendingCapitalGates,
    openRelayBlockers: relayBlockers,
    currentConnections: connections.length,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    intelligence,
  });
}
