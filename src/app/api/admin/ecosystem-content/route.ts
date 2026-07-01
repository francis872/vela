import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  ensureEcosystemSeedContent,
  listEcosystemContent,
  type EcosystemModule,
} from "@/lib/ecosystem-content-service";
import { prisma } from "@/lib/prisma";

const moduleSchema = z.enum(["human", "space", "adventure"]);

const createSchema = z.object({
  module: moduleSchema,
  category: z.string().min(2).max(64),
  title: z.string().min(2).max(180),
  summary: z.string().min(2).max(240),
  detail: z.string().max(500).optional().nullable(),
  meta: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

const updateSchema = z.object({
  id: z.string().min(1),
  module: moduleSchema.optional(),
  category: z.string().min(2).max(64).optional(),
  title: z.string().min(2).max(180).optional(),
  summary: z.string().min(2).max(240).optional(),
  detail: z.string().max(500).optional().nullable(),
  meta: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureEcosystemSeedContent();
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get("module");
    const parsedModule = moduleParam ? moduleSchema.safeParse(moduleParam) : null;

    if (moduleParam && !parsedModule?.success) {
      return NextResponse.json({ error: "Modulo invalido" }, { status: 400 });
    }

    const module = parsedModule?.success
      ? (parsedModule.data as EcosystemModule)
      : undefined;

    const content = await listEcosystemContent(module);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar contenido" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json();
    const parsed = createSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", issues: parsed.error.issues }, { status: 400 });
    }

    const content = await prisma.ecosystemContent.create({
      data: {
        module: parsed.data.module,
        category: parsed.data.category,
        title: parsed.data.title,
        summary: parsed.data.summary,
        detail: parsed.data.detail,
        meta: parsed.data.meta,
        tags: parsed.data.tags,
        sortOrder: parsed.data.sortOrder,
        createdById: auth.session.sub,
        createdByName: auth.session.name,
      },
    });

    return NextResponse.json({ content }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear contenido" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json();
    const parsed = updateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", issues: parsed.error.issues }, { status: 400 });
    }

    const { id, ...data } = parsed.data;
    const content = await prisma.ecosystemContent.update({
      where: { id },
      data,
    });

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar contenido" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json();
    const parsed = deleteSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", issues: parsed.error.issues }, { status: 400 });
    }

    await prisma.ecosystemContent.delete({
      where: { id: parsed.data.id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar contenido" }, { status: 500 });
  }
}
