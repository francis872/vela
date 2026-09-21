import {analyzeFinancials,valueVenture,type FinancialInput} from "@/lib/valuation-engine";
import {forecastFinancials} from "@/lib/financial-forecasting";

export type CapitalTwinChanges={capitalRaise?:number;equityOffered?:number;revenueChangePct?:number;customerChangePct?:number;cacChangePct?:number;monthlyHiringCost?:number;additionalMonthlyCosts?:number;debtChange?:number};
export type CapitalTwinAssumptions={months:number;revenueGrowth:number;costGrowth:number;volatility:number;simulations:number;seed:number;revenueMultiple?:number|null;ebitdaMultiple?:number|null;discountRate?:number|null;terminalGrowth?:number|null;projectedGrowth?:number|null};
const n=(v:number|undefined)=>Number.isFinite(v)?v??0:0; const round=(x:number)=>Math.round(x*100)/100;
export function propagateCapitalScenario(base:FinancialInput,changes:CapitalTwinChanges,a:CapitalTwinAssumptions){
 const revenue=Math.max(0,base.revenue*(1+n(changes.revenueChangePct)/100));
 const customers=base.customers==null?null:Math.max(0,Math.round(base.customers*(1+n(changes.customerChangePct)/100)));
 const marketing=base.marketingSpend??null,newCustomers=base.newCustomers??null;
 const impliedCac=newCustomers&&marketing!=null?marketing/newCustomers:null;
 const targetCac=impliedCac==null?null:impliedCac*(1+n(changes.cacChangePct)/100);
 const adjustedMarketing=targetCac!=null&&newCustomers?targetCac*newCustomers:marketing;
 const scenario:FinancialInput={...base,revenue,customers,marketingSpend:adjustedMarketing,cash:Math.max(0,(base.cash??0)+n(changes.capitalRaise)),debt:Math.max(0,(base.debt??0)+n(changes.debtChange)),operatingCosts:Math.max(0,base.operatingCosts+n(changes.monthlyHiringCost)+n(changes.additionalMonthlyCosts))};
 const before=analyzeFinancials(base),after=analyzeFinancials(scenario);
 const valuation=valueVenture(scenario,{revenueMultiple:a.revenueMultiple,ebitdaMultiple:a.ebitdaMultiple,discountRate:a.discountRate,terminalGrowth:a.terminalGrowth,projectedGrowth:a.projectedGrowth,capitalRequested:changes.capitalRaise,equityOffered:changes.equityOffered});
 const forecast=forecastFinancials(scenario,{months:a.months,revenueGrowth:a.revenueGrowth,costGrowth:a.costGrowth,volatility:a.volatility,simulations:a.simulations,seed:a.seed});
 const delta={revenue:round(after.revenue-before.revenue),ebitda:round(after.ebitda-before.ebitda),burn:round(after.burn-before.burn),runwayMonths:before.runwayMonths==null||after.runwayMonths==null?null:round(after.runwayMonths-before.runwayMonths),customers:base.customers==null||scenario.customers==null?null:scenario.customers-base.customers,cash:round((scenario.cash??0)-(base.cash??0))};
 const warnings:string[]=[];if(changes.equityOffered!=null&&(changes.equityOffered<=0||changes.equityOffered>=100))warnings.push("Equity offered must be between 0 and 100 for deal valuation.");if(after.burn>0&&after.runwayMonths!=null&&after.runwayMonths<6)warnings.push("Scenario leaves less than six months of runway.");if(forecast.probabilityPositiveEbitda<50)warnings.push("Fewer than half of simulated paths end with positive EBITDA.");
 return {baseline:before,scenario:after,delta,valuation,forecast,warnings,explanation:"Scenario output propagates explicit changes through financial metrics, valuation and Monte Carlo. It does not mutate the real venture state."};
}
