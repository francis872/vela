import {analyzeFinancials,type FinancialInput} from "@/lib/valuation-engine";

export type FundraisingInput={
 targetRunwayMonths:number; equityOffered?:number|null; minimumCashBufferMonths?:number;
 productPct:number; technologyPct:number; marketPct:number; operationsPct:number;
 revenueGrowthTargetPct?:number|null; customerGrowthTargetPct?:number|null;
};

const round=(n:number)=>Math.round(n*100)/100;
export function buildFundraisingPlan(base:FinancialInput,input:FundraisingInput){
 const metrics=analyzeFinancials(base);
 const targetRunway=Math.max(6,Math.round(input.targetRunwayMonths));
 const buffer=Math.max(0,input.minimumCashBufferMonths??2);
 const monthlyNeed=metrics.burn>0?metrics.burn:Math.max(0,base.operatingCosts-(base.revenue-(base.cogs??0)));
 const requiredCash=monthlyNeed*(targetRunway+buffer);
 const currentCash=Math.max(0,base.cash??0);
 const targetRaise=Math.max(0,requiredCash-currentCash);
 const equity=input.equityOffered==null?null:Math.max(0,Math.min(99,input.equityOffered));
 const postMoney=equity&&targetRaise>0?targetRaise/(equity/100):null;
 const preMoney=postMoney==null?null:postMoney-targetRaise;
 const raw=[input.productPct,input.technologyPct,input.marketPct,input.operationsPct].map(x=>Math.max(0,x));
 const total=raw.reduce((a,b)=>a+b,0);
 const shares=total>0?raw.map(x=>x/total):[.25,.25,.25,.25];
 const useOfFunds=[
  {area:"Product",sharePct:round(shares[0]*100),amount:round(targetRaise*shares[0])},
  {area:"Technology",sharePct:round(shares[1]*100),amount:round(targetRaise*shares[1])},
  {area:"Market",sharePct:round(shares[2]*100),amount:round(targetRaise*shares[2])},
  {area:"Operations",sharePct:round(shares[3]*100),amount:round(targetRaise*shares[3])},
 ];
 const milestones=[
  {metric:"runway",target:targetRunway,unit:"months",rationale:"Finance the operating horizon before the next capital decision."},
  ...(input.revenueGrowthTargetPct!=null?[{metric:"revenue_growth",target:input.revenueGrowthTargetPct,unit:"%",rationale:"Demonstrate growth against the current financial baseline."}]:[]),
  ...(input.customerGrowthTargetPct!=null?[{metric:"customer_growth",target:input.customerGrowthTargetPct,unit:"%",rationale:"Demonstrate customer traction before the next round."}]:[]),
 ];
 const runwayNow=metrics.runwayMonths;
 const timing=targetRaise<=0?"NOT_REQUIRED":runwayNow==null?"PLAN_NOW":runwayNow<6?"URGENT":runwayNow<12?"PREPARE_NOW":"MONITOR";
 const nextRound={reviewAfterMonths:Math.max(3,targetRunway-6),evidenceRequired:milestones.map(m=>m.metric),principle:"Review the next round before the funded runway is exhausted; do not assume future financing will be available."};
 const warnings:string[]=[];
 if(monthlyNeed<=0) warnings.push("Current snapshot does not show positive burn; raise sizing is therefore cash-buffer based and may be zero.");
 if(equity!=null&&equity>20) warnings.push("Scenario assumes dilution above 20%; review ownership implications.");
 if(targetRaise===0) warnings.push("Current cash and operating profile already cover the requested runway under this static baseline.");
 return {targetRaise:round(targetRaise),targetRunway,timing,currentRunwayMonths:runwayNow,monthlyNeed:round(monthlyNeed),deal:{equityOffered:equity,preMoney:preMoney==null?null:round(preMoney),postMoney:postMoney==null?null:round(postMoney)},useOfFunds,milestones,nextRound,warnings,disclaimer:"This is a planning model from current evidence and supplied assumptions, not fundraising or investment advice and not a guarantee that capital will be available."};
}
