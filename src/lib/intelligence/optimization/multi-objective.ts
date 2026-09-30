import {optimizeGreyWolf,type GwoVariable,type GwoEvaluation,type GwoCandidate} from "./gwo";

export type ObjectiveDirection="max"|"min";
export type MultiObjectiveDefinition={name:string;direction:ObjectiveDirection;weight?:number};
export type MultiObjectiveResult={candidate:GwoCandidate;objectives:Record<string,number>};

function dominates(a:MultiObjectiveResult,b:MultiObjectiveResult,defs:MultiObjectiveDefinition[]){let strictly=false;for(const d of defs){const av=a.objectives[d.name],bv=b.objectives[d.name];if(av==null||bv==null)return false;if(d.direction==="max"){if(av<bv)return false;if(av>bv)strictly=true}else{if(av>bv)return false;if(av<bv)strictly=true}}return strictly}
export function paretoFront(results:MultiObjectiveResult[],defs:MultiObjectiveDefinition[]){return results.filter((r,i)=>!results.some((o,j)=>i!==j&&dominates(o,r,defs)))}
export function optimizeMultiObjective(
 variables:GwoVariable[],
 definitions:MultiObjectiveDefinition[],
 evaluate:(values:Record<string,number>)=>{objectives:Record<string,number>;feasible:boolean;violations?:string[]},
 options?:{iterations?:number;wolves?:number;seed?:number;runs?:number}
){
 const runs=Math.max(3,options?.runs??9),all:MultiObjectiveResult[]=[];
 for(let i=0;i<runs;i++){
  const weightShift=i/Math.max(1,runs-1);
  const result=optimizeGreyWolf(variables,(values):GwoEvaluation=>{
    const ev=evaluate(values);
    let score=0;
    definitions.forEach((d,idx)=>{const base=d.weight??1;const adaptive=base*(idx===0?1+weightShift:1+(1-weightShift)*.5);const val=ev.objectives[d.name]??0;score+=(d.direction==="max"?val:-val)*adaptive});
    return{score,feasible:ev.feasible,violations:ev.violations,objectives:ev.objectives};
  },{iterations:options?.iterations,wolves:options?.wolves,seed:(options?.seed??872)+i});
  for(const c of result.pack){if(c.feasible&&c.objectives)all.push({candidate:c,objectives:c.objectives})}
 }
 const unique=new Map<string,MultiObjectiveResult>();
 for(const r of all){const key=JSON.stringify(r.candidate.values);if(!unique.has(key))unique.set(key,r)}
 const front=paretoFront([...unique.values()],definitions).sort((a,b)=>b.candidate.score-a.candidate.score);
 return{version:"MULTI_OBJECTIVE_GWO_V1",definitions,front,solutions:front.length,totalEvaluated:all.length};
}
