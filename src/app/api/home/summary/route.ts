import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalEvaluations,
      evaluationsLast7Days,
      avgIev,
      recentEvaluations,
      recentQuickActions,
    ] = await Promise.all([
      prisma.evaluation.count(),
      prisma.evaluation.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.evaluation.aggregate({
        _avg: {
          iev: true,
        },
      }),
      prisma.evaluation.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          classification: true,
          iev: true,
          createdAt: true,
        },
      }),
      prisma.quickActionExecution.findMany({
        where: {
          userId: auth.session.sub,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          module: true,
          actionKey: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalEvaluations,
        evaluationsLast7Days,
        averageIev: Math.round(avgIev._avg.iev ?? 0),
        quickActionsByMe: recentQuickActions.length,
      },
      recentEvaluations,
      recentQuickActions,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar resumen de VELA Home" },
      { status: 500 },
    );
  }
}
