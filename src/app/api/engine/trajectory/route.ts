import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { collectVentureStats } from "@/lib/venture-metrics";
import {
  assessExecutionRisk,
  assessTrajectory,
  assessValidationGap,
} from "@/lib/predictions";

export const dynamic = "force-dynamic";

/**
 * GET /api/engine/trajectory
 *
 * Baseline predictive layer over real execution data. Always explainable;
 * returns INSUFFICIENT_DATA when there is not enough history.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const stats = await collectVentureStats(auth.session.sub);

  return NextResponse.json({
    trajectory: assessTrajectory(stats),
    executionRisk: assessExecutionRisk(stats),
    validationRisk: assessValidationGap(stats),
  });
}
