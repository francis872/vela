import {mutateTwin,type VentureTwin} from "./venture-twin";
export type ScenarioChange={path:string;mode:"set"|"delta"|"percent";value:number;reason?:string};
export type ScenarioAssumptions={velocityPerCompletion?:number;riskPerBlockedObjective?:number;validationPerSignal?:number;readinessPerValidation?:number};
function get(o:any,path:string){return path.split(".").reduce((a,k)=>a?.[k],o)}function round(x:number){return Math.round(x*10000)/10000}
function numericDelta(a:any,b:any){return typeof a==="number"&&typeof b==="number"&&Number.isFinite(a)&&Number.isFinite(b)?round(b-a):null}
export function simulateVentureScenario(twin:VentureTwin,changes:ScenarioChange[],assumptions:ScenarioAssumptions={}){
 const mutations:{path:string;value:number;reason?:string}[]=[],evidence:string[]=[];
 for(const c of changes){const current=get(twin.working,c.path);if(typeof current!=="number"||!Number.isFinite(current)){evidence.push(c.path+": unavailable numeric baseline; skipped");continue}const value=c.mode==="set"?c.value:c.mode==="delta"?current+c.value:current*(1+c.value/100);mutations.push({path:c.path,value:Math.max(0,round(value)),reason:c.reason});evidence.push(c.path+": "+current+" -> "+Math.max(0,round(value)))}
 let next=mutateTwin(twin,mutations),s=next.working,b=twin.baseline;
 const derived:{path:string;value:number;reason:string}[]=[];
 const add=(path:string,value:number,reason:string)=>derived.push({path,value:Math.max(0,Math.min(100,round(value))),reason});
 if(assumptions.velocityPerCompletion&&s.pulse.velocity!=null)add("pulse.velocity",s.pulse.velocity+(s.execution.objectives.completed-b.execution.objectives.completed)*assumptions.velocityPerCompletion,"explicit completion-to-velocity assumption");
 if(assumptions.riskPerBlockedObjective&&s.pulse.risk!=null)add("pulse.risk",s.pulse.risk+(s.execution.objectives.blocked-b.execution.objectives.blocked)*assumptions.riskPerBlockedObjective,"explicit blocked-objective risk assumption");
 if(assumptions.validationPerSignal&&s.pulse.validation!=null)add("pulse.validation",s.pulse.validation+(s.validation.signals-b.validation.signals)*assumptions.validationPerSignal,"explicit signal-to-validation assumption");
 if(derived.length)next=mutateTwin(next,derived);
 s=next.working;
 if(assumptions.readinessPerValidation&&s.pulse.readiness!=null&&s.pulse.validation!=null&&b.pulse.validation!=null)next=mutateTwin(next,[{path:"pulse.readiness",value:Math.max(0,Math.min(100,round(s.pulse.readiness+(s.pulse.validation-b.pulse.validation)*assumptions.readinessPerValidation))),reason:"explicit validation-to-readiness assumption"}]);
 s=next.working;const warnings:string[]=[];if(s.execution.objectives.blocked>s.execution.objectives.total)warnings.push("Blocked objectives exceed total objectives.");if(s.execution.objectives.completed>s.execution.objectives.total)warnings.push("Completed objectives exceed total objectives.");
 const paths=["identity.teamSize","execution.objectives.blocked","execution.objectives.atRisk","execution.objectives.completed","execution.assignments.active","execution.assignments.totalWeight","execution.resources.activeAllocations","validation.signals","risk.openSignals","pulse.velocity","pulse.validation","pulse.risk","pulse.readiness","pulse.sprintCompletion"];
 const deltas=Object.fromEntries(paths.map(p=>[p,numericDelta(get(b,p),get(s,p))]));
 return{status:"AVAILABLE" as const,version:"SCENARIO_ENGINE_V1",subjectId:twin.subjectId,baseline:b,scenario:s,deltas,mutations:next.mutations,evidence,assumptions,warnings,explanation:"Hypothetical changes are applied to a cloned venture state. Derived propagation only uses explicit supplied assumptions; no production state is mutated and causal certainty is not asserted."};
}
