import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createExperimentSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  stage: z.string().min(3).max(80).default("Problema"),
  result: z.string().min(3).max(120).default("En progreso"),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const experiments = await prisma.builderExperiment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        stage: true,
        result: true,
        createdByName: true,
        createdByEmail: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ experiments });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar experimentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createExperimentSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const sequence = await prisma.builderExperiment.count();
    const title = parsed.data.title?.trim().length
      ? parsed.data.title.trim()
      : `Experimento ${sequence + 1}`;

    const experiment = await prisma.builderExperiment.create({
      data: {
        title,
        stage: parsed.data.stage,
        result: parsed.data.result,
        createdById: auth.session.sub,
        createdByName: auth.session.name,
        createdByEmail: auth.session.email,
      },
      select: {
        id: true,
        title: true,
        stage: true,
        result: true,
        createdByName: true,
        createdByEmail: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ experiment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear experimento" }, { status: 500 });
  }
}
