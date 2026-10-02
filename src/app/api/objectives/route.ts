import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { requireVentureCapabilityForUser } from "@/lib/venture-access";

const OBJECTIVE_STATUSES = ["on_track", "at_risk", "blocked", "completed"] as const;
type ObjectiveStatusValue = (typeof OBJECTIVE_STATUSES)[number];
function isValidStatus(value: unknown): value is ObjectiveStatusValue {
  return typeof value === "string" && (OBJECTIVE_STATUSES as readonly string[]).includes(value);
}
function requestedVenture(req: NextRequest, body?: Record<string, unknown>) {
  return (body?.ventureId as string | undefined) ?? new URL(req.url).searchParams.get("ventureId");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req); if (!auth.ok) return auth.response;
  const access = await requireVentureCapabilityForUser({ userId: auth.session.sub, ventureId: requestedVenture(req), capability: "venture.objectives.read" });
  if (!access) return NextResponse.json({ error: "No autorizado para este venture" }, { status: 403 });
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
  const statusParam = url.searchParams.get("status");
  const objectives = await prisma.objective.findMany({
    where: { ventureId: access.venture.id, ...(isValidStatus(statusParam) ? { status: statusParam } : {}) },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }], take: limit,
    include: { _count: { select: { signals: true } } },
  });
  return NextResponse.json(objectives);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req); if (!auth.ok) return auth.response;
  const body = await req.json(); const { title, description, status, priority, dueDate, cycleId } = body;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (status !== undefined && !isValidStatus(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  const access = await requireVentureCapabilityForUser({ userId: auth.session.sub, ventureId: requestedVenture(req, body), capability: "venture.objectives.write" });
  if (!access) return NextResponse.json({ error: "No autorizado para este venture" }, { status: 403 });
  const obj = await prisma.objective.create({ data: {
    title:title.trim(), description:description?.trim()??null, status:status??"on_track",
    priority:Number.isInteger(priority)?priority:1, dueDate:dueDate?new Date(dueDate):null,
    cycleId:cycleId??null, ventureId:access.venture.id, ownerId:access.venture.userId, ownerName:auth.session.name,
  }});
  await dispatchDomainEvent("objective_created",{objectiveId:obj.id,ownerId:access.venture.userId,ventureId:access.venture.id,actorId:auth.session.sub});
  return NextResponse.json(obj,{status:201});
}

export async function PATCH(req: NextRequest) {
  const auth=await requireAuth(req); if(!auth.ok)return auth.response;
  const body=await req.json(); const {id,...updates}=body;
  if(!id)return NextResponse.json({error:"id required"},{status:400});
  if(updates.status!==undefined&&!isValidStatus(updates.status))return NextResponse.json({error:"invalid status"},{status:400});
  const existing=await prisma.objective.findUnique({where:{id},select:{id:true,ventureId:true}});
  if(!existing?.ventureId)return NextResponse.json({error:"Not found"},{status:404});
  const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:existing.ventureId,capability:"venture.objectives.write"});
  if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
  const obj=await prisma.objective.update({where:{id},data:{
    ...(updates.title&&{title:String(updates.title).trim()}),
    ...(updates.description!==undefined&&{description:updates.description}),
    ...(updates.status&&{status:updates.status}),
    ...(updates.priority!==undefined&&Number.isInteger(updates.priority)&&{priority:updates.priority}),
    ...(updates.dueDate!==undefined&&{dueDate:updates.dueDate?new Date(updates.dueDate):null}),
  }});
  await dispatchDomainEvent("objective_updated",{objectiveId:obj.id,ownerId:access.venture.userId,ventureId:access.venture.id,actorId:auth.session.sub});
  return NextResponse.json(obj);
}

export async function DELETE(req: NextRequest) {
  const auth=await requireAuth(req); if(!auth.ok)return auth.response;
  const {id}=await req.json(); if(!id)return NextResponse.json({error:"id required"},{status:400});
  const existing=await prisma.objective.findUnique({where:{id},select:{id:true,ventureId:true}});
  if(!existing?.ventureId)return NextResponse.json({error:"Not found"},{status:404});
  const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:existing.ventureId,capability:"venture.objectives.delete"});
  if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
  await prisma.objective.delete({where:{id}});
  await dispatchDomainEvent("objective_deleted",{objectiveId:id,ownerId:access.venture.userId,ventureId:access.venture.id,actorId:auth.session.sub});
  return NextResponse.json({ok:true});
}
