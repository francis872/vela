export type CrossModuleInput={
  capital:{samples:number;portfolioEfficiency:number|null;recentEfficiency:number|null;previousEfficiency:number|null;reallocation:{from:string;to:string;delta:number}|null;planned:number;spent:number;openDeployments:{title:string;planned:number;spent:number;status:string;milestone:string|null}[]};
  team:{members:number;totalLoad:number;overloaded:number;concentration:number};
  resources:{monthlyCost:number;unusedPaid:number;criticalUnavailable:number;criticalUnallocated:number};
  build:{active:number;blocked:number;atRisk:number};
  validation:{signals:number;interviews:number;recentSignals:number};
  sprint:{active:boolean;completion:number|null;openItems:number};
};

export type CrossModuleSignal={
  code:string;
  severity:"CRITICAL"|"HIGH"|"MEDIUM"|"LOW";
  confidence:"HIGH"|"MEDIUM"|"LOW";
  title:string;
  explanation:string;
  modules:string[];
  evidence:string[];
  trend:"DETERIORATING"|"IMPROVING"|"STABLE"|"UNKNOWN";
  action:{label:string;href:string};
  score:number;
};

const severityWeight={CRITICAL:100,HIGH:75,MEDIUM:50,LOW:25};
const confidenceWeight={HIGH:15,MEDIUM:8,LOW:3};
function signal(x:Omit<CrossModuleSignal,"score">):CrossModuleSignal{return{...x,score:severityWeight[x.severity]+confidenceWeight[x.confidence]+(x.trend==="DETERIORATING"?8:0)}}
function confidence(samples:number){return samples>=8?"HIGH" as const:samples>=3?"MEDIUM" as const:"LOW" as const}

export function synthesizeCrossModuleSignals(input:CrossModuleInput){
 const out:CrossModuleSignal[]=[];
 const capitalTrend=input.capital.recentEfficiency!=null&&input.capital.previousEfficiency!=null?input.capital.recentEfficiency-input.capital.previousEfficiency:null;
 if(capitalTrend!=null&&capitalTrend<=-8)out.push(signal({code:"CAPITAL_EFFICIENCY_DECLINING",severity:capitalTrend<=-18?"HIGH":"MEDIUM",confidence:confidence(input.capital.samples),title:"Capital efficiency is deteriorating",explanation:`Recent deployment efficiency is ${Math.abs(Math.round(capitalTrend*10)/10)} points below the prior observation window.`,modules:["Capital","Learning"],evidence:[`capital_efficiency_recent:${input.capital.recentEfficiency}`,`capital_efficiency_previous:${input.capital.previousEfficiency}`,`samples:${input.capital.samples}`],trend:"DETERIORATING",action:{label:"Review capital learning",href:"/capital"}}));
 const overruns=input.capital.openDeployments.filter(x=>x.planned>0&&x.spent/x.planned>=.9&&x.status!=="closed");
 if(overruns.length)out.push(signal({code:"MILESTONE_OVERRUN",severity:overruns.some(x=>x.spent>=x.planned)?"HIGH":"MEDIUM",confidence:"HIGH",title:"Milestone capital is nearly exhausted before outcome closure",explanation:`${overruns.length} deployment(s) have consumed at least 90% of planned capital without a closed learning outcome.`,modules:["Capital","Build"],evidence:overruns.slice(0,4).map(x=>`deployment:${x.title}:${Math.round(x.spent/x.planned*100)}%`),trend:"DETERIORATING",action:{label:"Inspect deployment ledger",href:"/capital"}}));
 const unspent=Math.max(0,input.capital.planned-input.capital.spent);
 if(unspent>0&&input.team.overloaded>0)out.push(signal({code:"CAPACITY_CAPITAL_MISMATCH",severity:input.team.overloaded>=2?"HIGH":"MEDIUM",confidence:"HIGH",title:"Capital capacity exceeds team execution capacity",explanation:`There is unspent planned capital while ${input.team.overloaded} team member(s) are overloaded. More spend may not translate into throughput until capacity is rebalanced.`,modules:["Capital","Team","Build"],evidence:[`unspent_planned_capital:${unspent}`,`overloaded_members:${input.team.overloaded}`,`team_load:${input.team.totalLoad}`],trend:"DETERIORATING",action:{label:"Review team capacity",href:"/team"}}));
 if((input.build.active>=2||input.sprint.openItems>=3)&&input.validation.interviews===0)out.push(signal({code:"EXECUTION_WITHOUT_VALIDATION",severity:input.build.active>=4?"HIGH":"MEDIUM",confidence:"HIGH",title:"Execution is advancing without customer validation",explanation:"Build and Sprint contain active work, but no customer interview evidence is available.",modules:["Build","Sprint","Validate"],evidence:[`active_objectives:${input.build.active}`,`open_sprint_items:${input.sprint.openItems}`,"customer_interviews:0"],trend:"DETERIORATING",action:{label:"Strengthen validation",href:"/validate"}}));
 if(input.resources.unusedPaid>0)out.push(signal({code:"RESOURCE_SPEND_WITHOUT_IMPACT",severity:input.resources.unusedPaid>=3?"HIGH":"MEDIUM",confidence:"HIGH",title:"Paid resources are not producing visible operating use",explanation:`${input.resources.unusedPaid} paid resource(s) are marked unused. Review them before allocating additional capital.`,modules:["Resources","Capital"],evidence:[`unused_paid_resources:${input.resources.unusedPaid}`,`resource_monthly_cost:${input.resources.monthlyCost}`],trend:"DETERIORATING",action:{label:"Review resources",href:"/space"}}));
 if(input.capital.reallocation&&input.capital.samples>=3)out.push(signal({code:"REALLOCATION_EVIDENCE_AVAILABLE",severity:"MEDIUM",confidence:confidence(input.capital.samples),title:"Capital reallocation evidence is available",explanation:`${input.capital.reallocation.to} has outperformed ${input.capital.reallocation.from} by ${input.capital.reallocation.delta} efficiency points in observed deployment outcomes. Treat this as a hypothesis for testing, not causal proof.`,modules:["Capital","Learning"],evidence:[`from:${input.capital.reallocation.from}`,`to:${input.capital.reallocation.to}`,`efficiency_gap:${input.capital.reallocation.delta}`,`samples:${input.capital.samples}`],trend:"IMPROVING",action:{label:"Review allocation hypothesis",href:"/capital"}}));
 if(input.resources.criticalUnavailable>0||input.resources.criticalUnallocated>0)out.push(signal({code:"RESOURCE_EXECUTION_CONSTRAINT",severity:"HIGH",confidence:"HIGH",title:"A critical resource is constraining execution",explanation:"At least one critical resource is unavailable or not allocated to active work.",modules:["Resources","Build"],evidence:[`critical_unavailable:${input.resources.criticalUnavailable}`,`critical_unallocated:${input.resources.criticalUnallocated}`],trend:"DETERIORATING",action:{label:"Resolve resource constraint",href:"/space"}}));
 if(input.build.blocked>0)out.push(signal({code:"BLOCKED_EXECUTION",severity:"HIGH",confidence:"HIGH",title:"Blocked objectives are stopping execution",explanation:`${input.build.blocked} active objective(s) are explicitly blocked.`,modules:["Build","Engine"],evidence:[`blocked_objectives:${input.build.blocked}`,`at_risk_objectives:${input.build.atRisk}`],trend:"DETERIORATING",action:{label:"Resolve blockers",href:"/build"}}));
 out.sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code));
 const top=out[0]??null;
 return {status:top?(top.severity==="CRITICAL"||top.severity==="HIGH"?"ATTENTION":"FOCUS"):"STABLE",top,signals:out,modulesObserved:["Capital","Team","Resources","Build","Validate","Sprint"],generatedFrom:"persisted_cross_module_evidence"};
}
