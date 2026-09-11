import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { buildPlatformGraph } from "@/lib/platform-graph";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/graph
 * Returns the full platform graph (nodes, edges, analysis).
 * Only admins and analistas get the full multi-user view.
 * Operadores get a single-user view restricted to themselves.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const isAdmin = session.role === "admin" || session.role === "analista";

  // Fetch users (admins see all, others see only themselves)
  const users = isAdmin
    ? await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } })
    : [{ id: session.sub, name: session.name ?? "Tú", role: session.role }];

  const userIds = users.map((u) => u.id);

  // Fetch connections
  const connections = isAdmin
    ? await prisma.userConnection.findMany({
        select: { fromUserId: true, toUserId: true, type: true },
      })
    : await prisma.userConnection.findMany({
        where: { OR: [{ fromUserId: session.sub }, { toUserId: session.sub }] },
        select: { fromUserId: true, toUserId: true, type: true },
      });

  // Fetch activity from QuickActionExecution (user → module usage)
  const rawActivity = await prisma.quickActionExecution.groupBy({
    by: ["userId", "module"],
    _count: { id: true },
    where: isAdmin ? {} : { userId: session.sub },
  });

  const activity = rawActivity
    .filter((a) => userIds.includes(a.userId))
    .map((a) => ({ userId: a.userId, module: a.module, count: a._count.id }));

  const { nodes, edges, analysis } = buildPlatformGraph({ users, connections, activity });

  return NextResponse.json({ nodes, edges, analysis });
}
