import assert from "node:assert/strict";
import { rankPriorities } from "../src/lib/algorithms/priority-engine";
import { recommendAllocation } from "../src/lib/algorithms/team-allocation";
import { propagateRisk } from "../src/lib/algorithms/risk-propagation";
import { rbfSimilarity } from "../src/lib/algorithms/rbf-similarity";
import { optimizeExecutionPlan } from "../src/lib/algorithms/ssa-aco-optimizer";

const ranked=rankPriorities([
 {id:"a",title:"Critical blocked",status:"blocked",priority:1,dueDate:"2026-09-20",signalCount:0,downstreamImpact:3,unmetDependencies:0,criticalPath:true,assignedLoad:2,resourceReady:true},
 {id:"b",title:"Normal work",status:"on_track",priority:2,dueDate:"2026-10-20",signalCount:3,downstreamImpact:0,unmetDependencies:0,criticalPath:false,assignedLoad:2,resourceReady:true},
],{now:new Date("2026-09-21T12:00:00Z")});
assert.equal(ranked[0].id,"a");
assert.ok(ranked[0].score>ranked[1].score);
assert.ok(ranked[0].reasons.includes("blocked execution"));

const allocation=recommendAllocation({id:"w",requiredSkills:["TypeScript","Data"],weight:2},[
 {id:"overloaded",skills:["TypeScript","Data"],load:8,active:true},
 {id:"fit",skills:["TypeScript","Data"],load:1,active:true},
 {id:"other",skills:["Sales"],load:0,active:true},
]);
assert.equal(allocation[0].memberId,"fit");
assert.equal(allocation[allocation.length-1].memberId,"overloaded");

const risk=propagateRisk([{id:"root",baseRisk:1},{id:"child",baseRisk:0},{id:"leaf",baseRisk:0}],[{from:"child",to:"root"},{from:"leaf",to:"child"}],{attenuation:.5});
assert.equal(risk.nodeRisk.root,1);
assert.equal(risk.nodeRisk.child,.5);
assert.equal(risk.nodeRisk.leaf,.25);

const identical=rbfSimilarity({velocity:50,risk:20},{velocity:50,risk:20});
const distant=rbfSimilarity({velocity:50,risk:20},{velocity:90,risk:80});
assert.equal(identical.similarity,1);
assert.ok(distant.similarity<identical.similarity);

const plan=optimizeExecutionPlan([
 {id:"foundation",utility:80,cost:2,risk:.1,executable:true,dependencies:[]},
 {id:"dependent",utility:90,cost:2,risk:.1,executable:true,dependencies:["foundation"]},
 {id:"noise",utility:10,cost:4,risk:.8,executable:true,dependencies:[]},
],4,{seed:872,iterations:10,ants:8});
assert.ok(plan.selected.includes("foundation"));
assert.ok(plan.selected.includes("dependent"));
assert.ok(!plan.selected.includes("noise"));

const adaptivePlan=optimizeExecutionPlan([
 {id:"safe",utility:60,cost:2,risk:.05,executable:true,dependencies:[]},
 {id:"risky",utility:75,cost:2,risk:.9,executable:true,dependencies:[]},
],2,{seed:872,iterations:8,ants:6,riskPenalty:40,exploration:.1,evaporation:.9});
assert.ok(adaptivePlan.selected.includes("safe"));
assert.ok(!adaptivePlan.selected.includes("risky"));

console.log("Algorithm tests passed");
