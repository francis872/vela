type FundUse={area:string;sharePct:number;amount:number};type Milestone={metric:string;target:number;unit:string;rationale:string};
export type CapitalExecutionInput={targetRaise:number;targetRunway:number;useOfFunds:FundUse[];milestones:Milestone[];team:{members:number;totalLoad:number;overloaded:number;concentration:number};resources:{total:number;monthlyCost:number;criticalUnavailable:number;unusedPaid:number};objectives:{id:string;title:string;status:string}[]};
const round=(n:number)=>Math.round(n*100)/100;
export function buildCapitalExecutionPlan(x:CapitalExecutionInput){
 const by=(area:string)=>x.useOfFunds.find(u=>u.area.toLowerCase()===area.toLowerCase())?.amount??0;
 const product=by("Product"),technology=by("Technology"),market=by("Market"),operations=by("Operations");
 const monthlyBudget=x.targetRunway>0?x.targetRaise/x.targetRunway:0;
 const capacityGap=x.team.overloaded>0||x.team.concentration>=70;
 const resourceGap=x.resources.criticalUnavailable>0;
 const work=[
  {type:"capital_milestone",title:"Protect funded runway",budget:round(operations),priority:1,evidence:`target_runway:${x.targetRunway}`},
  {type:"capital_milestone",title:"Fund product milestones",budget:round(product),priority:2,evidence:`milestones:${x.milestones.length}`},
  {type:"capital_milestone",title:"Increase technology capacity",budget:round(technology),priority:capacityGap?1:3,evidence:`team_load:${x.team.totalLoad}`},
  {type:"capital_milestone",title:"Fund market validation and growth",budget:round(market),priority:3,evidence:`objectives:${x.objectives.length}`},
 ].sort((a,b)=>a.priority-b.priority);
 const risks:string[]=[];if(capacityGap)risks.push("Team capacity may constrain deployment of new capital.");if(resourceGap)risks.push("Critical unavailable resources can block funded execution.");if(x.resources.unusedPaid>0)risks.push("Paid unused resources should be reviewed before adding spend.");if(!x.objectives.length)risks.push("No active objectives are available to absorb funded milestones.");
 const readiness=risks.length>=3?"ATTENTION":risks.length?"FOCUS":"READY";
 return {readiness,monthlyBudget:round(monthlyBudget),work,teamImpact:{capacityGap,recommendedHiringBudget:round(technology),currentMembers:x.team.members,load:x.team.totalLoad,concentration:x.team.concentration},resourceImpact:{resourceGap,currentMonthlyCost:x.resources.monthlyCost,criticalUnavailable:x.resources.criticalUnavailable,unusedPaid:x.resources.unusedPaid},milestoneLinks:x.milestones.map((m,i)=>({...m,sequence:i+1,executionStatus:"UNFUNDED_UNTIL_ROUND_CLOSE"})),risks,principle:"Capital allocation becomes executable only after an explicit round-close or funding confirmation. Planning does not mutate team, resource or objective state."};
}