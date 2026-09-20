import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { synthesizeDecisionIntelligence } from "@/lib/decision-intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const decisions = await prisma.decision.findMany({
    where: { ownerId: auth.session.sub },
    orderBy: [{ reviewAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    intelligence: synthesizeDecisionIntelligence(decisions),
  });
}
