import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(req.url);
  const requestedOwner = searchParams.get("ownerId");
  // Cross-user reads only for staff roles; founders always get their own score.
  const canReadOthers = session.role === "admin" || session.role === "analista";
  const ownerId = canReadOthers && requestedOwner ? requestedOwner : session.sub;

  const score = await prisma.founderScore.findUnique({ where: { ownerId } });
  return NextResponse.json(score ?? { ownerId, execution: 0, results: 0, collaboration: 0 });
}
