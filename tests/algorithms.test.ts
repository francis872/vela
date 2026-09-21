import assert from "node:assert/strict";
import { rankPriorities } from "../src/lib/algorithms/priority-engine";
import { recommendAllocation } from "../src/lib/algorithms/team-allocation";

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

console.log("Algorithm tests passed");
