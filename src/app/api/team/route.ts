import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { synthesizeTeamIntelligence } from "@/lib/team-intelligence";

export const dynamic = "force-dynamic";

async function ownerVenture(ownerId: string) {
  return prisma.venture.findUnique({ where: { userId: ownerId }, select: { id: true, name: true } });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const venture = await ownerVenture(auth.session.sub);
  if (!venture) return NextResponse.json({ venture: null, members: [], intelligence: synthesizeTeamIntelligence([]) });

  const members = await prisma.ventureMember.findMany({
    where: { ventureId: venture.id },
    include: { user: { select: { id:true, name:true, position:true, headline:true, availability:true, userSkills:{ include:{ skill:{select:{name:true}} } } } } },
    orderBy: { joinedAt: "asc" },
  });
  const normalized = members.map((m) => ({
    id:m.id, userId:m.userId, name:m.user.name, role:m.role, responsibility:m.responsibility,
    position:m.user.position, headline:m.user.headline, availability:m.user.availability,
    skills:m.user.userSkills.map((entry) => entry.skill.name), status:m.status, joinedAt:m.joinedAt,
  }));
  return NextResponse.json({ venture, members: normalized, intelligence: synthesizeTeamIntelligence(normalized) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const venture = await ownerVenture(auth.session.sub);
  if (!venture) return NextResponse.json({ error: "Create a venture first" }, { status: 409 });
  const body = await req.json().catch(() => ({}));
  const { userId, role, responsibility } = body;
  if (!userId || !role?.trim()) return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { id:userId, active:true }, select:{id:true} });
  if (!user) return NextResponse.json({ error:"User not found" }, { status:404 });

  const member = await prisma.ventureMember.upsert({
    where: { ventureId_userId: { ventureId: venture.id, userId } },
    create: { ventureId:venture.id, userId, role:role.trim(), responsibility:responsibility?.trim() || null },
    update: { role:role.trim(), responsibility:responsibility?.trim() || null, status:"active" },
  });
  await dispatchDomainEvent("team_member_added", { memberId:member.id, ventureId:venture.id, ownerId:auth.session.sub, userId });
  return NextResponse.json(member, { status:201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const venture = await ownerVenture(auth.session.sub);
  if (!venture) return NextResponse.json({ error:"Venture not found" }, { status:404 });
  const body = await req.json().catch(() => ({}));
  const { id, role, responsibility, status } = body;
  const existing = await prisma.ventureMember.findFirst({ where:{id,ventureId:venture.id} });
  if (!existing) return NextResponse.json({ error:"Member not found" }, { status:404 });
  const member = await prisma.ventureMember.update({
    where:{id},
    data:{
      role: typeof role === "string" && role.trim() ? role.trim() : existing.role,
      responsibility: typeof responsibility === "string" ? responsibility.trim() || null : existing.responsibility,
      status: status === "active" || status === "inactive" ? status : existing.status,
    },
  });
  await dispatchDomainEvent("team_member_updated", { memberId:id, ventureId:venture.id, ownerId:auth.session.sub, status:member.status });
  return NextResponse.json(member);
}
