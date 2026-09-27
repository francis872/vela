export type DiscreteOption={id:string;utility:number;cost:number;risk?:number;dependencies?:string[];group?:string;enabled?:boolean};
function seeded(seed:number){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
function evaluate(selected:Set<string>,byId:Map<string,DiscreteOption>,capacity:number,riskPenalty:number){
 let utility=0,cost=0,risk=0;const violations:string[]=[];
 for(const id of selected){const x=byId.get(id);if(!x||x.enabled===false){violations.push(`disabled:${id}`);continue}utility+=x.utility;cost+=Math.max(0,x.cost);risk+=Math.max(0,x.risk??0);for(const d of x.dependencies??[])if(byId.has(d)&&!selected.has(d))violations.push(`missing_dependency:${id}->${d}`)}
 if(cost>capacity)violations.push("capacity_exceeded");
 return{feasible:violations.length===0,score:utility-risk*riskPenalty,cost,utility,risk,violations};
}
export function optimizeDiscrete(options:DiscreteOption[],capacity:number,config?:{iterations?:number;ants?:number;seed?:number;riskPenalty?:number;evaporation?:number}){
 const usable=options.filter(x=>x.enabled!==false),byId=new Map(usable.map(x=>[x.id,x])),random=seeded(config?.seed??872),iterations=Math.max(4,config?.iterations??18),ants=Math.max(4,config?.ants??12),riskPenalty=Math.max(0,config?.riskPenalty??20),evap=Math.max(.5,Math.min(.99,config?.evaporation??.88)),pheromone=new Map(usable.map(x=>[x.id,1]));
 let best=new Set<string>(),bestEval=evaluate(best,byId,capacity,riskPenalty);const trace:string[]=[];
 for(let it=0;it<iterations;it++){
  for(let a=0;a<ants;a++){const selected=new Set<string>(),remaining=[...usable];while(remaining.length){const feasible=remaining.filter(x=>evaluate(new Set([...selected,x.id]),byId,capacity,riskPenalty).feasible);if(!feasible.length)break;const weighted=feasible.map(x=>({x,w:(pheromone.get(x.id)??1)*Math.max(.01,x.utility/Math.max(1,x.cost)*(1-(x.risk??0)*.5))}));let pick=random()*weighted.reduce((s,e)=>s+e.w,0),chosen=weighted[weighted.length-1].x;for(const e of weighted){pick-=e.w;if(pick<=0){chosen=e.x;break}}selected.add(chosen.id);remaining.splice(remaining.findIndex(x=>x.id===chosen.id),1)}const ev=evaluate(selected,byId,capacity,riskPenalty);if((ev.feasible&&!bestEval.feasible)||ev.score>bestEval.score){best=selected;bestEval=ev}}
  for(const x of usable)pheromone.set(x.id,Math.max(.1,(pheromone.get(x.id)??1)*evap));for(const id of best)pheromone.set(id,(pheromone.get(id)??1)+Math.max(0,bestEval.score)/100);
  if(it===0||it===iterations-1||it%6===5)trace.push(`iteration:${it+1}:score=${bestEval.score.toFixed(2)}`);
 }
 return{selected:[...best],...bestEval,trace,version:"ACO_V1"};
}
