export type GwoVariable={name:string;min:number;max:number};
export type GwoEvaluation={score:number;feasible:boolean;violations?:string[];objectives?:Record<string,number>};
export type GwoCandidate={values:Record<string,number>;score:number;feasible:boolean;violations:string[];objectives?:Record<string,number>};

function seeded(seed:number){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function evaluate(values:Record<string,number>,fn:(values:Record<string,number>)=>GwoEvaluation):GwoCandidate{const r=fn(values);return{values,score:r.score,feasible:r.feasible,violations:r.violations??[],objectives:r.objectives}}
function better(a:GwoCandidate,b:GwoCandidate){if(a.feasible!==b.feasible)return a.feasible;if(a.score!==b.score)return a.score>b.score;return a.violations.length<b.violations.length}

export function optimizeGreyWolf(
 variables:GwoVariable[],
 objective:(values:Record<string,number>)=>GwoEvaluation,
 options?:{iterations?:number;wolves?:number;seed?:number}
){
 const iterations=Math.max(4,options?.iterations??30),wolves=Math.max(6,options?.wolves??24),random=seeded(options?.seed??872);
 let pack:GwoCandidate[]=Array.from({length:wolves},()=>evaluate(Object.fromEntries(variables.map(v=>[v.name,v.min+random()*(v.max-v.min)])),objective));
 const trace:{iteration:number;alphaScore:number;betaScore:number;deltaScore:number;feasible:boolean}[]=[];
 for(let t=0;t<iterations;t++){
  pack.sort((a,b)=>better(a,b)?-1:better(b,a)?1:0);
  const alpha=pack[0],beta=pack[1]??alpha,delta=pack[2]??beta;
  const a=2-2*(t/Math.max(1,iterations-1));
  pack=pack.map((wolf,idx)=>{
   if(idx<3)return wolf;
   const next:Record<string,number>={};
   for(const v of variables){
    const x=wolf.values[v.name];
    const leaders=[alpha,beta,delta];
    const projections=leaders.map(leader=>{
      const r1=random(),r2=random(),A=2*a*r1-a,C=2*r2,D=Math.abs(C*leader.values[v.name]-x);
      return leader.values[v.name]-A*D;
    });
    next[v.name]=clamp((projections[0]+projections[1]+projections[2])/3,v.min,v.max);
   }
   return evaluate(next,objective);
  });
  pack.sort((a,b)=>better(a,b)?-1:better(b,a)?1:0);
  trace.push({iteration:t+1,alphaScore:pack[0].score,betaScore:(pack[1]??pack[0]).score,deltaScore:(pack[2]??pack[1]??pack[0]).score,feasible:pack[0].feasible});
 }
 pack.sort((a,b)=>better(a,b)?-1:better(b,a)?1:0);
 return{version:"GWO_V1",alpha:pack[0],beta:pack[1]??pack[0],delta:pack[2]??pack[1]??pack[0],pack,trace,iterations,wolves};
}
