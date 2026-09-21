import { NextRequest,NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { dispatchDomainEvent } from "@/lib/domain-events";
import { valueVenture } from "@/lib/valuation-engine";

export const dynamic="force-dynamic";

async function ventureFor(ownerId:string){return prisma.venture.findUnique({where:{userId:ownerId}});}

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await ventureFor(auth.session.sub);
 if(!venture)return NextResponse.json({status:"NO_VENTURE",snapshots:[],cases:[]});
 const [snapshots,cases]=await Promise.all([
  prisma.financialSnapshot.findMany({where:{ventureId:venture.id},orderBy:{period:"desc"},take:24}),
  prisma.valuationCase.findMany({where:{ventureId:venture.id},orderBy:{createdAt:"desc"},take:20}),
 ]);
 const latest=snapshots[0]??null;
 return NextResponse.json({status:latest?"AVAILABLE":"INSUFFICIENT_DATA",venture:{id:venture.id,name:venture.name,stage:venture.stage},latest,snapshots,cases});
}

export async function POST(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const venture=await ventureFor(auth.session.sub);
 if(!venture)return NextResponse.json({error:"Create a venture first."},{status:409});
 const body=await req.json().catch(()=>({}));
 if(body.kind==="snapshot"){
  const period=String(body.period??"").trim();
  const revenue=Number(body.revenue),operatingCosts=Number(body.operatingCosts);
  if(!/^\d{4}-\d{2}$/.test(period)||!Number.isFinite(revenue)||revenue<0||!Number.isFinite(operatingCosts)||operatingCosts<0)return NextResponse.json({error:"Valid period, revenue and operatingCosts are required."},{status:400});
  const nullable=(v:unknown)=>v===""||v==null?null:Number.isFinite(Number(v))?Number(v):null;
  const snapshot=await prisma.financialSnapshot.upsert({where:{ventureId_period:{ventureId:venture.id,period}},create:{ventureId:venture.id,period,currency:String(body.currency??"COP"),revenue,operatingCosts,cogs:nullable(body.cogs),cash:nullable(body.cash),debt:nullable(body.debt),customers:nullable(body.customers),newCustomers:nullable(body.newCustomers),marketingSpend:nullable(body.marketingSpend),churnRate:nullable(body.churnRate)},update:{currency:String(body.currency??"COP"),revenue,operatingCosts,cogs:nullable(body.cogs),cash:nullable(body.cash),debt:nullable(body.debt),customers:nullable(body.customers),newCustomers:nullable(body.newCustomers),marketingSpend:nullable(body.marketingSpend),churnRate:nullable(body.churnRate)}});
  await dispatchDomainEvent("financial_snapshot_recorded",{snapshotId:snapshot.id,ventureId:venture.id,ownerId:auth.session.sub,period});
  return NextResponse.json(snapshot,{status:201});
 }
 if(body.kind==="valuation"){
  const latest=await prisma.financialSnapshot.findFirst({where:{ventureId:venture.id},orderBy:{period:"desc"}});
  if(!latest)return NextResponse.json({error:"Record a financial snapshot before valuation."},{status:409});
  const n=(v:unknown)=>v===""||v==null?null:Number.isFinite(Number(v))?Number(v):null;
  const assumptions={capitalRequested:n(body.capitalRequested),equityOffered:n(body.equityOffered),revenueMultiple:n(body.revenueMultiple),ebitdaMultiple:n(body.ebitdaMultiple),discountRate:n(body.discountRate),terminalGrowth:n(body.terminalGrowth),projectedGrowth:n(body.projectedGrowth)};
  const result=valueVenture(latest,assumptions);
  const valuation=await prisma.valuationCase.create({data:{ventureId:venture.id,name:String(body.name??"Valuation case").trim()||"Valuation case",currency:latest.currency,...assumptions,result:result as unknown as object}});
  await dispatchDomainEvent("valuation_calculated",{valuationId:valuation.id,ventureId:venture.id,ownerId:auth.session.sub,status:result.status});
  return NextResponse.json({...valuation,result},{status:201});
 }
 return NextResponse.json({error:"kind must be snapshot or valuation"},{status:400});
}
