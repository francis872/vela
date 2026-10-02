import { NextRequest,NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { synthesizeResourceIntelligence } from "@/lib/resource-intelligence";
import { requireVentureCapabilityForUser } from "@/lib/venture-access";
export const dynamic="force-dynamic";
function requestedVenture(req:NextRequest,b?:Record<string,unknown>){return(b?.ventureId as string|undefined)??new URL(req.url).searchParams.get("ventureId");}
async function validOwnerMember(ventureId:string,memberId:unknown){
 if(!memberId)return true;
 const member=await prisma.ventureMember.findFirst({where:{id:String(memberId),ventureId,status:"active"},select:{id:true}});
 return Boolean(member);
}
export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:requestedVenture(req),capability:"venture.resources.read"});
 if(!access)return NextResponse.json({venture:null,resources:[],intelligence:synthesizeResourceIntelligence([])},{status:403});
 const resources=await prisma.spaceResource.findMany({where:{OR:[{ventureId:access.venture.id},{ventureId:null,ownerId:access.venture.userId}]},include:{allocations:{where:{status:"active"}}},orderBy:{createdAt:"desc"}});
 const normalized=resources.map(r=>({...r,allocations:r.allocations.length}));
 return NextResponse.json({venture:{id:access.venture.id,name:access.venture.name},resources,intelligence:synthesizeResourceIntelligence(normalized)});
}
export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;const b=await req.json().catch(()=>({}));
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:requestedVenture(req,b),capability:"venture.resources.write"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 if(!b.title?.trim())return NextResponse.json({error:"title required"},{status:400});
 if(!(await validOwnerMember(access.venture.id,b.ownerMemberId)))return NextResponse.json({error:"ownerMemberId must belong to the same venture"},{status:400});
 const resource=await prisma.spaceResource.create({data:{title:b.title.trim(),desc:b.desc?.trim()??"",tag:b.tag?.trim()??"Recurso",url:b.url?.trim()||null,authorName:auth.session.name,ownerId:access.venture.userId,ventureId:access.venture.id,resourceType:b.resourceType||"tool",status:b.status||"available",criticality:b.criticality||"normal",monthlyCost:typeof b.monthlyCost==="number"?b.monthlyCost:null,ownerMemberId:b.ownerMemberId||null,usageStatus:b.usageStatus||"unknown"}});
 await dispatchDomainEvent("resource_created",{resourceId:resource.id,ventureId:access.venture.id,ownerId:access.venture.userId,actorId:auth.session.sub,resourceType:resource.resourceType});
 return NextResponse.json(resource,{status:201});
}
export async function PATCH(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;const b=await req.json().catch(()=>({}));
 const existing=await prisma.spaceResource.findUnique({where:{id:b.id},select:{id:true,ventureId:true,ownerId:true,status:true,criticality:true,usageStatus:true,ownerMemberId:true,monthlyCost:true}});
 if(!existing)return NextResponse.json({error:"Resource not found"},{status:404});
 const ventureId=existing.ventureId??(await prisma.venture.findUnique({where:{userId:existing.ownerId},select:{id:true}}))?.id;
 if(!ventureId)return NextResponse.json({error:"Resource venture not found"},{status:409});
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId,capability:"venture.resources.write"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 if(b.ownerMemberId!==undefined&&b.ownerMemberId!==null&&!(await validOwnerMember(ventureId,b.ownerMemberId)))return NextResponse.json({error:"ownerMemberId must belong to the same venture"},{status:400});
 const resource=await prisma.spaceResource.update({where:{id:existing.id},data:{status:b.status??existing.status,criticality:b.criticality??existing.criticality,usageStatus:b.usageStatus??existing.usageStatus,ownerMemberId:b.ownerMemberId===null?null:b.ownerMemberId??existing.ownerMemberId,monthlyCost:b.monthlyCost===null?null:typeof b.monthlyCost==="number"?b.monthlyCost:existing.monthlyCost}});
 await dispatchDomainEvent("resource_updated",{resourceId:resource.id,ownerId:access.venture.userId,ventureId,actorId:auth.session.sub,status:resource.status});
 return NextResponse.json(resource);
}
