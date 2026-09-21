import { NextRequest,NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { analyzeGraph } from "@/lib/graph";
import { rankPriorities } from "@/lib/algorithms/priority-engine";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
 const auth=await requireAuth(req);if(!auth.ok)return auth.response;
 const ownerId=auth.session.sub;
 const venture=await prisma.venture.findUnique({where:{userId:ownerId},select:{id:true}});
 const [objectives,dependencies,assignments,resources]=await Promise.all([
  prisma.objective.findMany({where:{ownerId},include:{signals:{select:{id:true}}},orderBy:{createdAt:"asc"}}),
  prisma.objectiveDependency.findMany({where:{objective:{ownerId}}}),
  venture?prisma.workAssignment.findMany({where:{ventureId:venture.id,workType:"objective",status:{notIn:["completed","closed","done"]}}}):Promise.resolve([]),
  venture?prisma.resourceAllocation.findMany({where:{ventureId:venture.id,workType:"objective",status:"active"},include:{resource:true}}):Promise.resolve([]),
 ]);
 const nodes=objectives.map(o=>({id:o.id,label:o.title,status:o.status as any,priority:o.priority}));
 const edges=dependencies.map(d=>({from:d.objectiveId,to:d.dependsOnId}));
 const graph=analyzeGraph(nodes,edges);
 const deps=new Map<string,string[]>();for(const o of objectives)deps.set(o.id,[]);for(const e of edges)deps.get(e.from)?.push(e.to);
 const byId=new Map(objectives.map(o=>[o.id,o]));
 const ranked=rankPriorities(objectives.map(o=>{
  const assignment=assignments.find(a=>a.workId===o.id);
  const allocations=resources.filter(a=>a.workId===o.id);
  const resourceReady=allocations.length?allocations.every(a=>a.resource.status==="available"):null;
  return{id:o.id,title:o.title,status:o.status as any,priority:o.priority,dueDate:o.dueDate?.toISOString()??null,signalCount:o.signals.length,downstreamImpact:graph.blockingFactor[o.id]??0,unmetDependencies:(deps.get(o.id)??[]).filter(id=>byId.get(id)?.status!=="completed").length,criticalPath:graph.criticalPath.includes(o.id),assignedLoad:assignment?.weight??null,resourceReady};
 }));
 return NextResponse.json({generatedAt:new Date().toISOString(),algorithm:"VELA_PRIORITY_ENGINE_V1",weights:"deterministic_explainable",ranked,top:ranked[0]??null});
}
