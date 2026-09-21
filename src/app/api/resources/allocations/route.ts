import { NextRequest,NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await prisma.venture.findUnique({where:{userId:auth.session.sub},select:{id:true}});
 if(!venture)return NextResponse.json({error:"Venture not found"},{status:404});
 const b=await req.json().catch(()=>({}));
 if(!b.resourceId||!["objective","sprint_item","decision","blocker"].includes(b.workType)||!b.workId||!b.workTitle?.trim())return NextResponse.json({error:"resourceId, valid workType, workId and workTitle required"},{status:400});
 const resource=await prisma.spaceResource.findFirst({where:{id:b.resourceId,ownerId:auth.session.sub,OR:[{ventureId:venture.id},{ventureId:null}]}});
 if(!resource)return NextResponse.json({error:"Resource not found"},{status:404});
 const allocation=await prisma.resourceAllocation.upsert({where:{resourceId_ventureId_workType_workId:{resourceId:resource.id,ventureId:venture.id,workType:b.workType,workId:b.workId}},create:{resourceId:resource.id,ventureId:venture.id,workType:b.workType,workId:b.workId,workTitle:b.workTitle.trim()},update:{status:"active",releasedAt:null,workTitle:b.workTitle.trim()}});
 await dispatchDomainEvent("resource_allocated",{allocationId:allocation.id,resourceId:resource.id,ventureId:venture.id,ownerId:auth.session.sub,workType:b.workType,workId:b.workId});
 return NextResponse.json(allocation,{status:201});
}
export async function PATCH(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await prisma.venture.findUnique({where:{userId:auth.session.sub},select:{id:true}});
 if(!venture)return NextResponse.json({error:"Venture not found"},{status:404});
 const b=await req.json().catch(()=>({}));const existing=await prisma.resourceAllocation.findFirst({where:{id:b.id,ventureId:venture.id}});
 if(!existing)return NextResponse.json({error:"Allocation not found"},{status:404});
 const released=b.status==="released";
 const allocation=await prisma.resourceAllocation.update({where:{id:existing.id},data:{status:released?"released":"active",releasedAt:released?new Date():null}});
 await dispatchDomainEvent("resource_allocation_updated",{allocationId:allocation.id,resourceId:allocation.resourceId,ventureId:venture.id,ownerId:auth.session.sub,status:allocation.status});
 return NextResponse.json(allocation);
}
