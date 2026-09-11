import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.inspirePost.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Too long" }, { status: 400 });

  const post = await prisma.inspirePost.create({
    data: { content: content.trim(), authorName: session.name, ownerId: session.sub },
  });
  return NextResponse.json(post, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const post = await prisma.inspirePost.update({
    where: { id },
    data: { likes: { increment: 1 } },
  });
  return NextResponse.json(post);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const post = await prisma.inspirePost.findUnique({ where: { id } });
  if (!post || (post.ownerId !== session.sub && session.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.inspirePost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
