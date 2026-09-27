export type ContinuousVariable={name:string;min:number;max:number};
export type ContinuousCandidate={values:Record<string,number>;score:number;feasible:boolean;violations:string[]};
function seeded(seed:number){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
export function optimizeContinuous(
 variables:ContinuousVariable[],
 evaluate:(values:Record<string,number>)=>{score:number;feasible:boolean;violations?:string[]},
 options?:{iterations?:number;population?:number;seed?:number;exploration?:number}
){
 const iterations=Math.max(4,options?.iterations??24),population=Math.max(8,options?.population??30),random=seeded(options?.seed??872),exploration=Math.max(.05,Math.min(.9,options?.exploration??.35));
 let best:ContinuousCandidate|null=null;const trace:string[]=[];
 for(let it=0;it<iterations;it++){
  const candidates:ContinuousCandidate[]=[];
  for(let i=0;i<population;i++){
   const values:Record<string,number>={};
   for(const v of variables){
    if(best&&random()>exploration){
     const span=(v.max-v.min)*(.05+.25*(1-it/iterations));
     values[v.name]=clamp(best.values[v.name]+(random()*2-1)*span,v.min,v.max);
    }else values[v.name]=v.min+random()*(v.max-v.min);
   }
   const r=evaluate(values);candidates.push({values,score:r.score,feasible:r.feasible,violations:r.violations??[]});
  }
  candidates.sort((a,b)=>(b.feasible?1:0)-(a.feasible?1:0)||b.score-a.score);
  if(!best||((candidates[0].feasible&&!best.feasible)||candidates[0].score>best.score))best=candidates[0];
  if(it===0||it===iterations-1||it%6===5)trace.push(`iteration:${it+1}:score=${best?.score??0}:feasible=${best?.feasible??false}`);
 }
 return{best,trace,version:"SSA_V1",iterations,population};
}
