import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { detectSecurityAnomalies } from "@/lib/security-monitoring";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/security/alerts — internal security monitoring (admin only).
 * Aggregates anomaly signals; signals inform review, never auto-block.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["admin"]);
  if (!auth.ok) return auth.response;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [alerts, recentEvents] = await Promise.all([
    detectSecurityAnomalies(),
    prisma.securityEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, detail: true, userId: true, ip: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    alerts,
    recentEvents,
    generatedAt: new Date().toISOString(),
  });
}
