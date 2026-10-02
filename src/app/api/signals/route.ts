import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { requireVentureCapabilityForUser } from "@/lib/venture-access";

const SIGNAL_TYPES=["experiment","interview","metric","insight"] as const;
type SignalTypeValue=(typeof SIGNAL_TYPES)[number];
function isValidType(value:unknown):value is SignalTypeValue{return typeof value==="string"&&(SIGNAL_TYPES as readonly string[]).includes(value);}
function requestedVenture(req:NextRequest,body?:Record<string,unknown>){return(body?.ventureId as string|undefined)??new URL(req.url).searchParams.get("ventureId");}

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:requestedVenture(req),capability:"venture.validation.read"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 const url=new URL(req.url);const limit=Math.min(Math.max(Number(url.searchParams.get("limit")??50)||50,1),100);
 const typeParam=url.searchParams.get("type"),objectiveId=url.searchParams.get("objectiveId");
 if(objectiveId){const objective=await prisma.objective.findFirst({where:{id:objectiveId,ventureId:access.venture.id},select:{id:true}});if(!objective)return NextResponse.json({error:"objective not found"},{status:404});}
 const signals=await prisma.signal.findMany({where:{ownerId:access.venture.userId,...(isValidType(typeParam)?{type:typeParam}:{}),...(objectiveId?{objectiveId}:{})},orderBy:{createdAt:"desc"},take:limit});
 return NextResponse.json(signals);
}

export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;const body=await req.json();
 const {type,title,result,hypothesis,learning,objectiveId}=body;
 if(!isValidType(type)||!title?.trim())return NextResponse.json({error:"valid type and title required"},{status:400});
 let ventureId=requestedVenture(req,body);
 if(objectiveId){
  const objective=await prisma.objective.findUnique({where:{id:objectiveId},select:{id:true,ventureId:true}});
  if(!objective?.ventureId)return NextResponse.json({error:"objective not found"},{status:404});
  if(ventureId&&ventureId!==objective.ventureId)return NextResponse.json({error:"objective belongs to another venture"},{status:400});
  ventureId=objective.ventureId;
 }
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId,capability:"venture.validation.write"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 if(objectiveId){const valid=await prisma.objective.findFirst({where:{id:objectiveId,ventureId:access.venture.id},select:{id:true}});if(!valid)return NextResponse.json({error:"objective not found"},{status:404});}
 const signal=await prisma.signal.create({data:{type,title:title.trim(),result:result?.trim()??null,hypothesis:hypothesis?.trim()??null,learning:learning?.trim()??null,objectiveId:objectiveId??null,ownerId:access.venture.userId,ownerName:auth.session.name}});
 if(type==="interview"||type==="metric")await dispatchDomainEvent(type==="interview"?"interview_created":"metric_recorded",{signalId:signal.id,ownerId:access.venture.userId,ventureId:access.venture.id,actorId:auth.session.sub,objectiveId:signal.objectiveId});
 return NextResponse.json(signal,{status:201});
}

export async function DELETE(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;const {id}=await req.json();if(!id)return NextResponse.json({error:"id required"},{status:400});
 const signal=await prisma.signal.findUnique({where:{id},select:{id:true,ownerId:true,objective:{select:{ventureId:true}}}});
 let ventureId=signal?.objective?.ventureId??null;
 if(!ventureId&&signal){const venture=await prisma.venture.findUnique({where:{userId:signal.ownerId},select:{id:true}});ventureId=venture?.id??null;}
 if(!signal||!ventureId)return NextResponse.json({error:"Not found"},{status:404});
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId,capability:"venture.validation.delete"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 await prisma.signal.delete({where:{id}});return NextResponse.json({ok:true});
}
