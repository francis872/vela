import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { analyzeTeamCapacity, teamCapacityIntelligence } from "@/lib/team-capacity";

export const dynamic="force-dynamic";

async function ventureFor(ownerId:string){return prisma.venture.findUnique({where:{userId:ownerId},select:{id:true,name:true}})}

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await ventureFor(auth.session.sub);if(!venture)return NextResponse.json({venture:null,members:[],assignments:[],unassigned:{objective:0,sprint_item:0,decision:0,blocker:0},capacity:null});
 const [members,assignments,objectives,sprints,decisions,blockers]=await Promise.all([
  prisma.ventureMember.findMany({where:{ventureId:venture.id,status:"active"},include:{user:{select:{name:true}}}}),
  prisma.workAssignment.findMany({where:{ventureId:venture.id},orderBy:{createdAt:"desc"}}),
  prisma.objective.findMany({where:{ownerId:auth.session.sub,status:{not:"completed"}},select:{id:true,title:true,status:true,dueDate:true}}),
  prisma.sprint.findMany({where:{ownerId:auth.session.sub,status:{not:"completed"}},include:{items:{where:{done:false}}}}),
  prisma.decision.findMany({where:{ownerId:auth.session.sub,outcome:null},select:{id:true,title:true,reviewAt:true}}),
  prisma.thread.findMany({where:{authorId:auth.session.sub,category:"blocker"},select:{id:true,title:true,createdAt:true}}),
 ]);
 const activeKeys=new Set(assignments.filter(a=>!["completed","closed","done"].includes(a.status)).map(a=>`${a.workType}:${a.workId}`));
 const sprintItems=sprints.flatMap(s=>s.items.map(i=>({id:i.id,title:i.title,dueAt:s.weekEnd})));
 const unassigned={
  objective:objectives.filter(x=>!activeKeys.has(`objective:${x.id}`)).length,
  sprint_item:sprintItems.filter(x=>!activeKeys.has(`sprint_item:${x.id}`)).length,
  decision:decisions.filter(x=>!activeKeys.has(`decision:${x.id}`)).length,
  blocker:blockers.filter(x=>!activeKeys.has(`blocker:${x.id}`)).length,
 };
 const capacity=analyzeTeamCapacity(members.map(m=>({id:m.id,name:m.user.name,role:m.role,status:m.status})),assignments);
 return NextResponse.json({venture,members:members.map(m=>({id:m.id,name:m.user.name,role:m.role,responsibility:m.responsibility})),assignments,unassigned,capacity,intelligence:teamCapacityIntelligence(capacity,unassigned),availableWork:{objectives,sprintItems,decisions,blockers}});
}

export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await ventureFor(auth.session.sub);if(!venture)return NextResponse.json({error:"Venture not found"},{status:404});
 const body=await req.json().catch(()=>({}));const {memberId,workType,workId,title,status,weight,dueAt}=body;
 if(!memberId||!["objective","sprint_item","decision","blocker"].includes(workType)||!workId||!title?.trim())return NextResponse.json({error:"memberId, valid workType, workId and title required"},{status:400});
 const member=await prisma.ventureMember.findFirst({where:{id:memberId,ventureId:venture.id,status:"active"},select:{id:true}});
 if(!member)return NextResponse.json({error:"Active team member not found"},{status:404});
 const assignment=await prisma.workAssignment.upsert({
  where:{ventureId_memberId_workType_workId:{ventureId:venture.id,memberId,workType,workId}},
  create:{ventureId:venture.id,memberId,workType,workId,title:title.trim(),status:status||"active",weight:Number.isInteger(weight)?Math.min(Math.max(weight,1),5):1,dueAt:dueAt?new Date(dueAt):null,source:"team"},
  update:{title:title.trim(),status:status||"active",weight:Number.isInteger(weight)?Math.min(Math.max(weight,1),5):1,dueAt:dueAt?new Date(dueAt):null},
 });
 await dispatchDomainEvent("team_work_assigned",{assignmentId:assignment.id,memberId,ventureId:venture.id,ownerId:auth.session.sub,workType,workId});
 return NextResponse.json(assignment,{status:201});
}

export async function PATCH(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await ventureFor(auth.session.sub);if(!venture)return NextResponse.json({error:"Venture not found"},{status:404});
 const body=await req.json().catch(()=>({}));const existing=await prisma.workAssignment.findFirst({where:{id:body.id,ventureId:venture.id}});
 if(!existing)return NextResponse.json({error:"Assignment not found"},{status:404});
 const assignment=await prisma.workAssignment.update({where:{id:existing.id},data:{status:body.status??existing.status,weight:Number.isInteger(body.weight)?Math.min(Math.max(body.weight,1),5):existing.weight,dueAt:body.dueAt===null?null:body.dueAt?new Date(body.dueAt):existing.dueAt}});
 await dispatchDomainEvent("team_work_updated",{assignmentId:assignment.id,memberId:assignment.memberId,ventureId:venture.id,ownerId:auth.session.sub,status:assignment.status});
 return NextResponse.json(assignment);
}
