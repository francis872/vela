import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token).catch(() => null);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  const resources = await prisma.spaceResource.findMany({
    where: {
      ...(tag && tag !== "Todo" ? { tag } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { desc: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(resources);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, desc, tag, url } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const resource = await prisma.spaceResource.create({
    data: {
      title: title.trim(),
      desc: desc?.trim() ?? "",
      tag: tag?.trim() ?? "Recurso",
      url: url?.trim() || null,
      authorName: session.name,
      ownerId: session.sub,
    },
  });
  return NextResponse.json(resource, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const resource = await prisma.spaceResource.findUnique({ where: { id } });
  if (!resource || (resource.ownerId !== session.sub && session.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.spaceResource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
