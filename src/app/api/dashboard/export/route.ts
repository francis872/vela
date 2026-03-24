import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function escapeCsv(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

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

    const evaluations = await prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        classification: true,
        iev: true,
        monthlyRevenue: true,
        monthlyCosts: true,
        potentialMargin: true,
        digitalization: true,
        replicability: true,
        differentiation: true,
        survivalProbability: true,
        revenueDoubleProb: true,
        expansionProbability: true,
        formalizationProb: true,
        failureRisk: true,
        createdAt: true,
      },
    });

    const header = [
      "id",
      "classification",
      "iev",
      "monthlyRevenue",
      "monthlyCosts",
      "potentialMargin",
      "digitalization",
      "replicability",
      "differentiation",
      "survivalProbability",
      "revenueDoubleProb",
      "expansionProbability",
      "formalizationProb",
      "failureRisk",
      "createdAt",
    ].join(",");

    const lines = evaluations.map((item: {
      id: string;
      classification: string;
      iev: number;
      monthlyRevenue: number;
      monthlyCosts: number;
      potentialMargin: number;
      digitalization: number;
      replicability: number;
      differentiation: number;
      survivalProbability: number;
      revenueDoubleProb: number;
      expansionProbability: number;
      formalizationProb: number;
      failureRisk: number;
      createdAt: Date;
    }) =>
      [
        item.id,
        item.classification,
        item.iev,
        item.monthlyRevenue,
        item.monthlyCosts,
        item.potentialMargin,
        item.digitalization,
        item.replicability,
        item.differentiation,
        item.survivalProbability,
        item.revenueDoubleProb,
        item.expansionProbability,
        item.formalizationProb,
        item.failureRisk,
        item.createdAt.toISOString(),
      ]
        .map((value) => escapeCsv(value))
        .join(","),
    );

    const csv = [header, ...lines].join("\n");
    const datePart = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=dashboard-evaluations-${datePart}.csv`,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo exportar CSV" }, { status: 500 });
  }
}
