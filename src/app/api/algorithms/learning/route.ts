import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getAlgorithmParameters, learnFromAlgorithmOutcomes } from "@/lib/algorithm-learning";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ownerId = auth.session.sub;
  const [parameters, recentRuns] = await Promise.all([
    getAlgorithmParameters(ownerId),
    prisma.algorithmRun.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, algorithmSet: true, outcomeScore: true, observedAt: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({
    mode: parameters.sampleCount > 0 ? "ADAPTIVE" : "DEFAULT",
    parameters,
    recentRuns,
    safeguards: {
      minimumObservationHours: 24,
      boundedLearningRate: [0.02, 0.12],
      automaticRollback: "defaults remain available when no learned profile exists",
      causalClaim: false,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const result = await learnFromAlgorithmOutcomes(auth.session.sub);
  return NextResponse.json(result);
}
