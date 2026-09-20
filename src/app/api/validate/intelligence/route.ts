import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { synthesizeValidateIntelligence } from "@/lib/validate-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;

  const [objectives, signals] = await Promise.all([
    prisma.objective.findMany({
      where: { ownerId },
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      include: { signals: { select: { type: true } } },
    }),
    prisma.signal.findMany({
      where: { ownerId },
      select: { id: true, type: true, objectiveId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const intelligence = synthesizeValidateIntelligence({
    objectives: objectives.map((objective) => ({
      id: objective.id,
      title: objective.title,
      status: objective.status,
      priority: objective.priority,
      signalCount: objective.signals.length,
      signalTypes: [...new Set(objective.signals.map((signal) => signal.type))],
    })),
    signals: signals.map((signal) => ({
      id: signal.id,
      type: signal.type,
      objectiveId: signal.objectiveId,
      createdAt: signal.createdAt,
    })),
  });

  return NextResponse.json({ generatedAt: new Date().toISOString(), intelligence });
}
