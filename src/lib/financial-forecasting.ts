import type { FinancialInput } from "@/lib/valuation-engine";

export type ForecastAssumptions={months:number;revenueGrowth:number;costGrowth:number;volatility:number;simulations:number;seed:number};
function rng(seed:number){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
function normal(random:()=>number){const u=Math.max(random(),1e-9),v=random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function q(xs:number[],p:number){const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)))]??0}
const round=(n:number)=>Math.round(n*100)/100;

export function forecastFinancials(base:FinancialInput,a:ForecastAssumptions){
 const months=Math.min(60,Math.max(1,Math.round(a.months))),simulations=Math.min(5000,Math.max(100,Math.round(a.simulations)));
 const random=rng(a.seed),terminalRevenue:number[]=[],terminalEbitda:number[]=[],cashOut:number[]=[];
 for(let i=0;i<simulations;i++){let revenue=base.revenue,cost=(base.cogs??0)+base.operatingCosts,cash=base.cash??0;for(let m=0;m<months;m++){const shock=normal(random)*Math.max(0,a.volatility);revenue=Math.max(0,revenue*(1+a.revenueGrowth/100+shock));cost=Math.max(0,cost*(1+a.costGrowth/100+shock*.35));cash+=revenue-cost;}terminalRevenue.push(revenue);terminalEbitda.push(revenue-cost);cashOut.push(cash);}
 return {months,simulations,seed:a.seed,terminalRevenue:{p10:round(q(terminalRevenue,.1)),p50:round(q(terminalRevenue,.5)),p90:round(q(terminalRevenue,.9))},terminalEbitda:{p10:round(q(terminalEbitda,.1)),p50:round(q(terminalEbitda,.5)),p90:round(q(terminalEbitda,.9))},terminalCash:{p10:round(q(cashOut,.1)),p50:round(q(cashOut,.5)),p90:round(q(cashOut,.9))},probabilityPositiveEbitda:round(terminalEbitda.filter(x=>x>0).length/simulations*100),disclaimer:"Monte Carlo scenarios are simulations from supplied assumptions, not predictions or guarantees."};
}

export function investorQuestions(financial:any,valuation:any,benchmarks:number,iotSignals:number){
 const questions:{question:string;answer:string;status:"READY"|"GAP"}[]=[];
 const add=(question:string,value:unknown,answer:string)=>questions.push({question,answer:value==null?"Evidence not available.":answer,status:value==null?"GAP":"READY"});
 add("What is monthly revenue?",financial?.revenue,financial?String(financial.revenue):"");
 add("What is gross margin?",valuation?.metrics?.grossMargin,valuation?.metrics?.grossMargin!=null?valuation.metrics.grossMargin+"%":"");
 add("What is EBITDA?",valuation?.metrics?.ebitda,valuation?.metrics?.ebitda!=null?String(valuation.metrics.ebitda):"");
 add("What is CAC?",valuation?.metrics?.cac,valuation?.metrics?.cac!=null?String(valuation.metrics.cac):"");
 add("What is LTV/CAC?",valuation?.metrics?.ltvCac,valuation?.metrics?.ltvCac!=null?String(valuation.metrics.ltvCac):"");
 add("What valuation evidence supports the ask?",valuation?.range?.midpoint,valuation?.range?.midpoint!=null?String(valuation.range.midpoint):"");
 questions.push({question:"Do you have external benchmarks?",answer:benchmarks?benchmarks+" sourced benchmark(s).":"No sourced benchmarks yet.",status:benchmarks?"READY":"GAP"});
 questions.push({question:"Do operations provide machine evidence?",answer:iotSignals?iotSignals+" IoT signal(s) linked.":"No IoT financial evidence yet.",status:iotSignals?"READY":"GAP"});
 return {ready:questions.filter(q=>q.status==="READY").length,total:questions.length,questions};
}
