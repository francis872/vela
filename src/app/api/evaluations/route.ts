import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { requireRole } from "@/lib/auth";

const evaluationSchema = z.object({
  companyName: z.string().min(2).max(160).optional(),
  companySector: z.string().min(2).max(120).optional(),
  businessModel: z.string().min(2).max(120).optional(),
  companyStage: z.string().min(2).max(120).optional(),
  trajectorySummary: z.string().max(3000).optional(),
  challengeSummary: z.string().max(3000).optional(),
  yearsOperating: z.number().int().min(0).max(200).optional(),
  teamSize: z.number().int().min(1).max(50000).optional(),
  monthlyRevenue: z.number().min(0),
  monthlyCosts: z.number().min(0),
  potentialMargin: z.number().min(0).max(100),
  digitalization: z.number().min(0).max(100),
  replicability: z.number().min(0).max(100),
  differentiation: z.number().min(0).max(100),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const evaluations = await prisma.evaluation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ evaluations });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron obtener evaluaciones" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json();
    const parsed = evaluationSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const score = computeScore(parsed.data);

    const companyData = {
      companyName: parsed.data.companyName?.trim() || "Empresa sin nombre",
      companySector: parsed.data.companySector?.trim() || "general",
      businessModel: parsed.data.businessModel?.trim() || "other",
      companyStage: parsed.data.companyStage?.trim() || "validation",
      trajectorySummary: parsed.data.trajectorySummary?.trim() || "",
      challengeSummary: parsed.data.challengeSummary?.trim() || "",
      yearsOperating: parsed.data.yearsOperating ?? 0,
      teamSize: parsed.data.teamSize ?? 1,
    };

    const numericData = {
      monthlyRevenue: parsed.data.monthlyRevenue,
      monthlyCosts: parsed.data.monthlyCosts,
      potentialMargin: parsed.data.potentialMargin,
      digitalization: parsed.data.digitalization,
      replicability: parsed.data.replicability,
      differentiation: parsed.data.differentiation,
    };

    const created = await prisma.evaluation.create({
      data: {
        ...companyData,
        ...numericData,
        ...score,
      },
    });

    return NextResponse.json({ evaluation: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la evaluación" },
      { status: 500 },
    );
  }
}
