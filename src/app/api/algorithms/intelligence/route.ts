import { NextRequest,NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { analyzeGraph } from "@/lib/graph";
import { rankPriorities } from "@/lib/algorithms/priority-engine";
import { propagateRisk } from "@/lib/algorithms/risk-propagation";
import { rankRbfMatches } from "@/lib/algorithms/rbf-similarity";
import { optimizeExecutionPlan } from "@/lib/algorithms/ssa-aco-optimizer";

export const dynamic="force-dynamic";

const baseRisk=(status:string)=>status==="blocked"?1:status==="at_risk"?.8:status==="on_track"?.25:0;

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const ownerId=auth.session.sub;
 const venture=await prisma.venture.findUnique({where:{userId:ownerId},select:{id:true}});
 const [objectives,dependencies,assignments,pulse]=await Promise.all([
  prisma.objective.findMany({where:{ownerId},include:{signals:{select:{id:true}}}}),
  prisma.objectiveDependency.findMany({where:{ownerId}}),
  venture?prisma.workAssignment.findMany({where:{ventureId:venture.id,status:{notIn:["completed","closed","done"]}}}):Promise.resolve([]),
  prisma.venturePulseSnapshot.findMany({where:{ownerId},orderBy:{capturedAt:"desc"},take:30}),
 ]);
 const nodes=objectives.map(o=>({id:o.id,label:o.title,status:o.status as any,priority:o.priority}));
 const edges=dependencies.map(d=>({from:d.objectiveId,to:d.dependsOnId}));
 const graph=analyzeGraph(nodes,edges);
 const risk=propagateRisk(objectives.map(o=>({id:o.id,baseRisk:baseRisk(o.status)})),edges);
 const deps=new Map<string,string[]>();for(const o of objectives)deps.set(o.id,[]);for(const e of edges)deps.get(e.from)?.push(e.to);
 const ranked=rankPriorities(objectives.map(o=>({id:o.id,title:o.title,status:o.status as any,priority:o.priority,dueDate:o.dueDate?.toISOString()??null,signalCount:o.signals.length,downstreamImpact:graph.blockingFactor[o.id]??0,unmetDependencies:(deps.get(o.id)??[]).filter(id=>objectives.find(x=>x.id===id)?.status!=="completed").length,criticalPath:graph.criticalPath.includes(o.id),assignedLoad:assignments.find(a=>a.workType==="objective"&&a.workId===o.id)?.weight??null,resourceReady:null})));
 const capacity=Math.max(1,Math.min(20,assignments.length?assignments.reduce((s,a)=>s+Math.max(1,a.weight),0):5));
 const plan=optimizeExecutionPlan(ranked.map(r=>({id:r.id,utility:r.score,cost:Math.max(1,assignments.find(a=>a.workType==="objective"&&a.workId===r.id)?.weight??1),risk:risk.nodeRisk[r.id]??baseRisk(r.status),executable:r.executable,dependencies:deps.get(r.id)??[]})),capacity);
 const latest=pulse[0];
 const history=pulse.slice(1);
 const target=latest?{velocity:latest.velocity,validation:latest.validation,risk:latest.risk,readiness:latest.readiness,sprintCompletion:latest.sprintCompletion}:null;
 const similarity=target?rankRbfMatches(target,history,p=>({velocity:p.velocity,validation:p.validation,risk:p.risk,readiness:p.readiness,sprintCompletion:p.sprintCompletion}),{minFeatures:2}).slice(0,5).map(m=>({snapshotId:m.item.id,capturedAt:m.item.capturedAt,similarity:m.similarity,distance:m.distance,comparedFeatures:m.comparedFeatures})):[];

 return NextResponse.json({generatedAt:new Date().toISOString(),algorithms:{risk:{name:"GRAPH_RISK_PROPAGATION_V1",...risk},similarity:{name:"RBF_STATE_SIMILARITY_V1",matches:similarity},optimization:{name:"SSA_ACO_EXECUTION_OPTIMIZER_V1",capacity,plan}},ranked});
}
