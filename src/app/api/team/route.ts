import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { synthesizeTeamIntelligence } from "@/lib/team-intelligence";
import { requireVentureCapabilityForUser } from "@/lib/venture-access";

export const dynamic="force-dynamic";
const VENTURE_ROLES=["founder","cofounder","operator","member","advisor","viewer"] as const;
function validRole(value:unknown):value is (typeof VENTURE_ROLES)[number]{return typeof value==="string"&&(VENTURE_ROLES as readonly string[]).includes(value.trim().toLowerCase());}
function requestedVenture(req:NextRequest,b?:Record<string,unknown>){return(b?.ventureId as string|undefined)??new URL(req.url).searchParams.get("ventureId");}

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:requestedVenture(req),capability:"venture.team.read"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 const members=await prisma.ventureMember.findMany({where:{ventureId:access.venture.id},include:{user:{select:{id:true,name:true,position:true,headline:true,availability:true,userSkills:{include:{skill:{select:{name:true}}}}}}},orderBy:{joinedAt:"asc"}});
 const normalized=members.map(m=>({id:m.id,userId:m.userId,name:m.user.name,role:m.role,responsibility:m.responsibility,position:m.user.position,headline:m.user.headline,availability:m.user.availability,skills:m.user.userSkills.map(e=>e.skill.name),status:m.status,joinedAt:m.joinedAt}));
 return NextResponse.json({venture:{id:access.venture.id,name:access.venture.name},members:normalized,intelligence:synthesizeTeamIntelligence(normalized)});
}
export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;const body=await req.json().catch(()=>({}));
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:requestedVenture(req,body),capability:"venture.team.manage"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 const {userId,role,responsibility}=body;if(!userId||!validRole(role))return NextResponse.json({error:"valid userId and controlled role required"},{status:400});
 if(userId===access.venture.userId)return NextResponse.json({error:"Venture owner is implicit and cannot be added as a member"},{status:409});
 const user=await prisma.user.findFirst({where:{id:userId,active:true,status:"active"},select:{id:true}});if(!user)return NextResponse.json({error:"User not found"},{status:404});
 const normalizedRole=role.trim().toLowerCase();
 const member=await prisma.ventureMember.upsert({where:{ventureId_userId:{ventureId:access.venture.id,userId}},create:{ventureId:access.venture.id,userId,role:normalizedRole,responsibility:responsibility?.trim()||null},update:{role:normalizedRole,responsibility:responsibility?.trim()||null,status:"active"}});
 await dispatchDomainEvent("team_member_added",{memberId:member.id,ventureId:access.venture.id,ownerId:access.venture.userId,actorId:auth.session.sub,userId,role:member.role});
 return NextResponse.json(member,{status:201});
}
export async function PATCH(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;const body=await req.json().catch(()=>({}));
 const existing=await prisma.ventureMember.findUnique({where:{id:body.id},select:{id:true,ventureId:true,role:true,responsibility:true,status:true}});
 if(!existing)return NextResponse.json({error:"Member not found"},{status:404});
 const access=await requireVentureCapabilityForUser({userId:auth.session.sub,ventureId:existing.ventureId,capability:"venture.team.manage"});
 if(!access)return NextResponse.json({error:"No autorizado para este venture"},{status:403});
 if(body.role!==undefined&&!validRole(body.role))return NextResponse.json({error:"invalid venture role"},{status:400});
 const member=await prisma.ventureMember.update({where:{id:existing.id},data:{role:body.role!==undefined?body.role.trim().toLowerCase():existing.role,responsibility:typeof body.responsibility==="string"?body.responsibility.trim()||null:existing.responsibility,status:body.status==="active"||body.status==="inactive"?body.status:existing.status}});
 await dispatchDomainEvent("team_member_updated",{memberId:member.id,ventureId:access.venture.id,ownerId:access.venture.userId,actorId:auth.session.sub,status:member.status,role:member.role});
 return NextResponse.json(member);
}
