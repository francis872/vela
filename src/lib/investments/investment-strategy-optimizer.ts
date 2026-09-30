import {optimizeMultiObjective,type MultiObjectiveDefinition} from "@/lib/intelligence/optimization/multi-objective";
import type {GwoVariable} from "@/lib/intelligence/optimization/gwo";

export type InvestmentOpportunityInput={
  id:string;
  title:string;
  capitalRequired:number;
  expectedReturn:number;
  liquidity:number;
  strategicFit:number;
  marketPotential:number;
  riskExposure:number;
};

export type InvestmentStrategyConstraints={
  budget:number;
  maxPerOpportunity?:Record<string,number>;
  minLiquidity?:number;
  maxRisk?:number;
  minStrategicFit?:number;
};

export type InvestmentStrategyObjectives={
  returnWeight?:number;
  liquidityWeight?:number;
  growthWeight?:number;
  strategicFitWeight?:number;
  riskWeight?:number;
};

function clamp100(n:number){return Math.max(0,Math.min(100,n))}
function weightedAverage(values:{value:number;weight:number}[]){const w=values.reduce((s,x)=>s+x.weight,0);return w?values.reduce((s,x)=>s+x.value*x.weight,0)/w:0}

export function optimizeInvestmentStrategy(
  opportunities:InvestmentOpportunityInput[],
  constraints:InvestmentStrategyConstraints,
  objectives:InvestmentStrategyObjectives={},
  options?:{seed?:number;iterations?:number;wolves?:number;runs?:number}
){
  const usable=opportunities.filter(o=>o.capitalRequired>0&&Number.isFinite(o.capitalRequired));
  const variables:GwoVariable[]=usable.map(o=>({
    name:`allocation:${o.id}`,
    min:0,
    max:Math.min(o.capitalRequired,constraints.maxPerOpportunity?.[o.id]??o.capitalRequired,constraints.budget)
  }));

  const defs:MultiObjectiveDefinition[]=[
    {name:"expectedReturn",direction:"max",weight:objectives.returnWeight??1},
    {name:"liquidity",direction:"max",weight:objectives.liquidityWeight??.7},
    {name:"growthPotential",direction:"max",weight:objectives.growthWeight??.8},
    {name:"strategicFit",direction:"max",weight:objectives.strategicFitWeight??.7},
    {name:"riskExposure",direction:"min",weight:objectives.riskWeight??1}
  ];

  const result=optimizeMultiObjective(variables,defs,values=>{
    const allocations=usable.map(o=>({o,amount:Math.max(0,values[`allocation:${o.id}`]??0)}));
    const deployed=allocations.reduce((s,x)=>s+x.amount,0);
    const active=allocations.filter(x=>x.amount>1e-6);
    const expectedReturn=weightedAverage(active.map(x=>({value:x.o.expectedReturn,weight:x.amount})));
    const liquidity=weightedAverage(active.map(x=>({value:x.o.liquidity,weight:x.amount})));
    const growthPotential=weightedAverage(active.map(x=>({value:(x.o.marketPotential+x.o.expectedReturn)/2,weight:x.amount})));
    const strategicFit=weightedAverage(active.map(x=>({value:x.o.strategicFit,weight:x.amount})));
    const riskExposure=weightedAverage(active.map(x=>({value:x.o.riskExposure,weight:x.amount})));
    const violations:string[]=[];
    if(deployed>constraints.budget+1e-6)violations.push("budget_exceeded");
    if(constraints.minLiquidity!=null&&liquidity<constraints.minLiquidity)violations.push("liquidity_below_minimum");
    if(constraints.maxRisk!=null&&riskExposure>constraints.maxRisk)violations.push("risk_above_maximum");
    if(constraints.minStrategicFit!=null&&strategicFit<constraints.minStrategicFit)violations.push("strategic_fit_below_minimum");
    return{
      objectives:{
        expectedReturn:Math.round(expectedReturn*1000)/1000,
        liquidity:Math.round(clamp100(liquidity)*1000)/1000,
        growthPotential:Math.round(clamp100(growthPotential)*1000)/1000,
        strategicFit:Math.round(clamp100(strategicFit)*1000)/1000,
        riskExposure:Math.round(clamp100(riskExposure)*1000)/1000
      },
      feasible:violations.length===0,
      violations
    };
  },options);

  const strategies=result.front.map((x,index)=>{
    const allocation=usable.map(o=>({opportunityId:o.id,title:o.title,amount:Math.round((x.candidate.values[`allocation:${o.id}`]??0)*100)/100})).filter(x=>x.amount>0);
    const deployed=allocation.reduce((s,x)=>s+x.amount,0);
    return{
      id:`strategy-${index+1}`,
      allocation,
      capitalDeployed:deployed,
      capitalRemaining:Math.max(0,constraints.budget-deployed),
      objectives:x.objectives,
      score:x.candidate.score,
      violations:x.candidate.violations
    };
  });

  return{
    version:"INVESTMENT_GWO_V1",
    algorithm:"MULTI_OBJECTIVE_GWO_V1",
    budget:constraints.budget,
    opportunityCount:usable.length,
    strategies,
    definitions:defs,
    totalEvaluated:result.totalEvaluated,
    notes:[
      "Strategies are Pareto-efficient candidates under the supplied assumptions and constraints.",
      "Expected return, liquidity, growth potential, strategic fit and risk are model inputs, not guarantees.",
      "VELA does not select an investment decision; it exposes efficient trade-offs for human review."
    ]
  };
}
