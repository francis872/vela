import { NextRequest,NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { synthesizeResourceIntelligence } from "@/lib/resource-intelligence";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await prisma.venture.findUnique({where:{userId:auth.session.sub},select:{id:true,name:true}});
 if(!venture)return NextResponse.json({venture:null,resources:[],intelligence:synthesizeResourceIntelligence([])});
 const resources=await prisma.spaceResource.findMany({where:{ownerId:auth.session.sub,OR:[{ventureId:venture.id},{ventureId:null}]},include:{allocations:{where:{status:"active"}}},orderBy:{createdAt:"desc"}});
 const normalized=resources.map(r=>({...r,allocations:r.allocations.length}));
 return NextResponse.json({venture,resources,intelligence:synthesizeResourceIntelligence(normalized)});
}

export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await prisma.venture.findUnique({where:{userId:auth.session.sub},select:{id:true}});
 if(!venture)return NextResponse.json({error:"Create a venture first"},{status:409});
 const b=await req.json().catch(()=>({}));
 if(!b.title?.trim())return NextResponse.json({error:"title required"},{status:400});
 const resource=await prisma.spaceResource.create({data:{title:b.title.trim(),desc:b.desc?.trim()??"",tag:b.tag?.trim()??"Recurso",url:b.url?.trim()||null,authorName:auth.session.name,ownerId:auth.session.sub,ventureId:venture.id,resourceType:b.resourceType||"tool",status:b.status||"available",criticality:b.criticality||"normal",monthlyCost:typeof b.monthlyCost==="number"?b.monthlyCost:null,ownerMemberId:b.ownerMemberId||null,usageStatus:b.usageStatus||"unknown"}});
 await dispatchDomainEvent("resource_created",{resourceId:resource.id,ventureId:venture.id,ownerId:auth.session.sub,resourceType:resource.resourceType});
 return NextResponse.json(resource,{status:201});
}

export async function PATCH(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const b=await req.json().catch(()=>({}));const existing=await prisma.spaceResource.findFirst({where:{id:b.id,ownerId:auth.session.sub}});
 if(!existing)return NextResponse.json({error:"Resource not found"},{status:404});
 const resource=await prisma.spaceResource.update({where:{id:existing.id},data:{status:b.status??existing.status,criticality:b.criticality??existing.criticality,usageStatus:b.usageStatus??existing.usageStatus,ownerMemberId:b.ownerMemberId===null?null:b.ownerMemberId??existing.ownerMemberId,monthlyCost:b.monthlyCost===null?null:typeof b.monthlyCost==="number"?b.monthlyCost:existing.monthlyCost}});
 await dispatchDomainEvent("resource_updated",{resourceId:resource.id,ownerId:auth.session.sub,status:resource.status});
 return NextResponse.json(resource);
}
