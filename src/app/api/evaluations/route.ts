import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { requireRole } from "@/lib/auth";

const evaluationSchema = z.object({
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

    const created = await prisma.evaluation.create({
      data: {
        ...parsed.data,
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
