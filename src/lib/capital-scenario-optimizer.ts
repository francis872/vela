import {propagateCapitalScenario,type CapitalTwinAssumptions,type CapitalTwinChanges} from "@/lib/capital-digital-twin";
import type {FinancialInput} from "@/lib/valuation-engine";

export type ScenarioBounds={
  capitalRaise:[number,number];
  equityOffered:[number,number];
  revenueChangePct:[number,number];
  customerChangePct:[number,number];
  cacChangePct:[number,number];
  monthlyHiringCost:[number,number];
  additionalMonthlyCosts:[number,number];
};

export type ScenarioConstraints={
  maxDilution:number;
  minRunwayMonths:number;
  minPositiveEbitdaProbability:number;
  maxMonthlyBurn:number;
};

type Candidate={changes:CapitalTwinChanges;score:number;feasible:boolean;reasons:string[];result:ReturnType<typeof propagateCapitalScenario>};

function seeded(seed:number){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

function scoreCandidate(result:Candidate["result"],changes:CapitalTwinChanges,constraints:ScenarioConstraints){
  const reasons:string[]=[];
  const dilution=changes.equityOffered??0;
  const runway=result.scenario.runwayMonths;
  const probability=result.forecast.probabilityPositiveEbitda;
  const burn=result.scenario.burn;
  if(dilution>constraints.maxDilution) reasons.push("dilution constraint violated");
  if(runway!=null&&runway<constraints.minRunwayMonths) reasons.push("runway constraint violated");
  if(probability<constraints.minPositiveEbitdaProbability) reasons.push("EBITDA probability constraint violated");
  if(burn>constraints.maxMonthlyBurn) reasons.push("burn constraint violated");
  const feasible=reasons.length===0;
  const valuationMid=result.valuation.range.midpoint??0;
  const runwayScore=runway==null?0:Math.min(36,runway)*2;
  const probabilityScore=probability;
  const ebitdaScore=Math.max(-100,Math.min(100,result.scenario.ebitda/Math.max(1,result.baseline.revenue)*100));
  const dilutionPenalty=dilution*1.5;
  const burnPenalty=result.scenario.burn>0?Math.min(100,result.scenario.burn/Math.max(1,result.baseline.revenue)*100):0;
  const valuationScore=valuationMid>0?Math.min(100,Math.log10(valuationMid+1)*10):0;
  const score=(feasible?0:-250)+runwayScore+probabilityScore+ebitdaScore+valuationScore-dilutionPenalty-burnPenalty;
  return {score:Math.round(score*100)/100,feasible,reasons};
}

export function optimizeCapitalScenario(
  base:FinancialInput,
  assumptions:CapitalTwinAssumptions,
  bounds:ScenarioBounds,
  constraints:ScenarioConstraints,
  options?:{iterations?:number;population?:number;seed?:number},
){
  const iterations=Math.max(6,options?.iterations??24),population=Math.max(12,options?.population??36),random=seeded(options?.seed??872);
  let pheromone=[1,1,1,1,1,1,1];
  let best:Candidate|null=null;
  const trace:string[]=[];

  for(let iter=0;iter<iterations;iter++){
    const candidates:Candidate[]=[];
    for(let i=0;i<population;i++){
      const exploit=best&&random()>.35;
      const sample=(range:[number,number],idx:number,current?:number)=>{
        if(exploit&&current!=null){
          const span=(range[1]-range[0])*(0.08+0.2*(1-pheromone[idx]/Math.max(...pheromone)));
          return Math.max(range[0],Math.min(range[1],current+(random()*2-1)*span));
        }
        return lerp(range[0],range[1],random());
      };
      const changes:CapitalTwinChanges={
        capitalRaise:sample(bounds.capitalRaise,0,best?.changes.capitalRaise),
        equityOffered:sample(bounds.equityOffered,1,best?.changes.equityOffered),
        revenueChangePct:sample(bounds.revenueChangePct,2,best?.changes.revenueChangePct),
        customerChangePct:sample(bounds.customerChangePct,3,best?.changes.customerChangePct),
        cacChangePct:sample(bounds.cacChangePct,4,best?.changes.cacChangePct),
        monthlyHiringCost:sample(bounds.monthlyHiringCost,5,best?.changes.monthlyHiringCost),
        additionalMonthlyCosts:sample(bounds.additionalMonthlyCosts,6,best?.changes.additionalMonthlyCosts),
      };
      const result=propagateCapitalScenario(base,changes,assumptions);
      const scored=scoreCandidate(result,changes,constraints);
      candidates.push({changes,result,...scored});
    }
    candidates.sort((a,b)=>b.score-a.score);
    if(!best||candidates[0].score>best.score) best=candidates[0];
    pheromone=pheromone.map((p,idx)=>Math.max(.2,p*.88+((best?.feasible?1:.4)*(idx<5?1:.7))));
    if(iter===0||iter===iterations-1||iter%6===5) trace.push(`iteration:${iter+1}:best=${best?.score??0}:feasible=${best?.feasible??false}`);
  }

  const alternatives:Candidate[]=[];
  for(let i=0;i<Math.min(8,population);i++){
    const jitter=(range:[number,number],v:number|undefined)=>Math.max(range[0],Math.min(range[1],(v??0)+(random()*2-1)*(range[1]-range[0])*.08));
    const changes:CapitalTwinChanges={
      capitalRaise:jitter(bounds.capitalRaise,best?.changes.capitalRaise),equityOffered:jitter(bounds.equityOffered,best?.changes.equityOffered),
      revenueChangePct:jitter(bounds.revenueChangePct,best?.changes.revenueChangePct),customerChangePct:jitter(bounds.customerChangePct,best?.changes.customerChangePct),
      cacChangePct:jitter(bounds.cacChangePct,best?.changes.cacChangePct),monthlyHiringCost:jitter(bounds.monthlyHiringCost,best?.changes.monthlyHiringCost),
      additionalMonthlyCosts:jitter(bounds.additionalMonthlyCosts,best?.changes.additionalMonthlyCosts),
    };
    const result=propagateCapitalScenario(base,changes,assumptions);const scored=scoreCandidate(result,changes,constraints);alternatives.push({changes,result,...scored});
  }
  alternatives.sort((a,b)=>b.score-a.score);
  return {best,alternatives:alternatives.slice(0,4),constraints,bounds,trace,disclaimer:"Optimizer explores simulated scenarios under supplied assumptions and constraints. It does not guarantee funding, valuation or future performance."};
}
