import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDateRaw = searchParams.get("startDate");
    const endDateRaw = searchParams.get("endDate");
    const classificationRaw = searchParams.get("classification");

    const where: {
      classification?: string;
      createdAt?: { gte?: Date; lt?: Date };
    } = {};

    if (
      classificationRaw &&
      classificationRaw !== "all" &&
      classificationRaw.trim().length > 0
    ) {
      where.classification = classificationRaw;
    }

    const createdAt: { gte?: Date; lt?: Date } = {};

    if (startDateRaw) {
      const startDate = new Date(startDateRaw);
      if (!Number.isNaN(startDate.getTime())) {
        createdAt.gte = startDate;
      }
    }

    if (endDateRaw) {
      const endDate = new Date(endDateRaw);
      if (!Number.isNaN(endDate.getTime())) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        createdAt.lt = nextDay;
      }
    }

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    const [total, avg, recent] = await Promise.all([
      prisma.evaluation.count({ where }),
      prisma.evaluation.aggregate({
        where,
        _avg: {
          iev: true,
          monthlyRevenue: true,
        },
      }),
      prisma.evaluation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          classification: true,
          iev: true,
          createdAt: true,
        },
      }),
    ]);

    const porClasificacion = await prisma.evaluation.groupBy({
      where,
      by: ["classification"],
      _count: { _all: true },
    });

    return NextResponse.json({
      metrics: {
        totalEvaluations: total,
        averageIEV: Math.round(avg._avg.iev ?? 0),
        averageRevenue: Math.round(avg._avg.monthlyRevenue ?? 0),
      },
      byClassification: porClasificacion,
      recent,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudieron cargar métricas. Verifica migración y conexión PostgreSQL.",
      },
      { status: 500 },
    );
  }
}
