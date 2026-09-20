import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { synthesizeVentureIntelligence } from "@/lib/venture-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;

  const [venture, objectives, signalGroups, sprints, gates] = await Promise.all([
    prisma.venture.findUnique({
      where: { userId: ownerId },
      include: {
        diagnostics: {
          select: { status: true, analysis: { select: { maturityScore: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.objective.findMany({ where: { ownerId }, select: { status: true } }),
    prisma.signal.groupBy({ by: ["type"], where: { ownerId }, _count: { id: true } }),
    prisma.sprint.findMany({ where: { ownerId }, select: { status: true } }),
    prisma.gate.findMany({ where: { ownerId }, select: { status: true } }),
  ]);

  const countSignal = (type: string) => signalGroups.find((group) => group.type === type)?._count.id ?? 0;
  const intelligence = synthesizeVentureIntelligence({
    venture: venture ? {
      id: venture.id,
      name: venture.name,
      sector: venture.sector,
      stage: venture.stage,
      description: venture.description,
      yearsOperating: venture.yearsOperating,
      teamSize: venture.teamSize,
      customers: venture.customers,
      monthlyRevenue: venture.monthlyRevenue,
      monthlyCosts: venture.monthlyCosts,
    } : null,
    diagnostics: {
      total: venture?.diagnostics.length ?? 0,
      analyzed: venture?.diagnostics.filter((item) => item.analysis).length ?? 0,
      latestMaturity: venture?.diagnostics.find((item) => item.analysis)?.analysis?.maturityScore ?? null,
    },
    objectives: {
      total: objectives.length,
      completed: objectives.filter((item) => item.status === "completed").length,
      blocked: objectives.filter((item) => item.status === "blocked").length,
      atRisk: objectives.filter((item) => item.status === "at_risk").length,
    },
    signals: {
      total: signalGroups.reduce((sum, group) => sum + group._count.id, 0),
      interviews: countSignal("interview"),
      metrics: countSignal("metric"),
    },
    sprints: {
      total: sprints.length,
      completed: sprints.filter((item) => item.status === "completed").length,
      blocked: sprints.filter((item) => item.status === "blocked").length,
    },
    gates: {
      total: gates.length,
      passed: gates.filter((item) => item.status === "passed").length,
      pending: gates.filter((item) => item.status === "pending").length,
    },
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    venture: venture ? {
      id: venture.id, name: venture.name, sector: venture.sector, stage: venture.stage,
      description: venture.description, yearsOperating: venture.yearsOperating,
      teamSize: venture.teamSize, customers: venture.customers,
      monthlyRevenue: venture.monthlyRevenue, monthlyCosts: venture.monthlyCosts,
      createdAt: venture.createdAt, updatedAt: venture.updatedAt,
    } : null,
    diagnostic: venture?.diagnostics[0] ? {
      status: venture.diagnostics[0].status,
      maturityScore: venture.diagnostics[0].analysis?.maturityScore ?? null,
    } : null,
    intelligence,
  });
}
