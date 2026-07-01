import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  const category = url.searchParams.get("category");

  const threads = await prisma.thread.findMany({
    where: category ? { category: category as "update" | "blocker" | "decision" | "win" } : {},
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json(threads);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista", "operador"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { title, body: threadBody, category } = body;

  if (!title?.trim() || !threadBody?.trim()) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const thread = await prisma.thread.create({
    data: {
      title: title.trim(),
      body: threadBody.trim(),
      category: category ?? "update",
      authorId: auth.session.sub,
      authorName: auth.session.name,
      authorRole: auth.session.role,
    },
  });

  return NextResponse.json(thread, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "analista"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await req.json();
  await prisma.thread.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
