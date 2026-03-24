import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createMessageSchema = z.object({
  content: z.string().min(3).max(280),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const messages = await prisma.coworkingMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        authorName: true,
        authorRole: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el coworking" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: "Mensaje inválido", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const message = await prisma.coworkingMessage.create({
      data: {
        content: parsed.data.content.trim(),
        authorId: auth.session.sub,
        authorName: auth.session.name,
        authorEmail: auth.session.email,
        authorRole: auth.session.role,
      },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorRole: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo publicar mensaje" }, { status: 500 });
  }
}
