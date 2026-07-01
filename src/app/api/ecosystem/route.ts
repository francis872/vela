import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [startups, wins] = await Promise.all([
    prisma.startupProfile.findMany({
      select: { id: true, ownerName: true, problem: true, solution: true, stage: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.thread.findMany({
      where: { category: "win" },
      select: { id: true, title: true, body: true, authorName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({ startups, wins, count: startups.length });
}
