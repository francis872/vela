import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { synthesizeRelayIntelligence } from "@/lib/relay-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;

  const [threads, decisions, connections] = await Promise.all([
    prisma.thread.findMany({
      where: { authorId: ownerId },
      select: { id: true, title: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.decision.findMany({
      where: { ownerId },
      select: { id: true, title: true, outcome: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.userConnection.findMany({
      where: { OR: [{ fromUserId: ownerId }, { toUserId: ownerId }] },
      select: { id: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const intelligence = synthesizeRelayIntelligence({
    threads: threads.map((thread) => ({ ...thread, category: thread.category as "update" | "blocker" | "decision" | "win" })),
    decisions,
    connections,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    intelligence,
  });
}
