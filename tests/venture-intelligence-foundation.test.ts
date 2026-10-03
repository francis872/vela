import assert from "node:assert/strict";
import {buildStateDraft} from "../src/lib/venture/services/venture-state-engine";
import {EvidenceService,VentureEvidenceError} from "../src/lib/venture/services/evidence-service";
import {VENTURE_DIMENSIONS,type VentureDimensionAssessment} from "../src/lib/venture/domain/types";

const available=(dimension:typeof VENTURE_DIMENSIONS[number],value:number,confidence:number):VentureDimensionAssessment=>({
  dimension,status:"AVAILABLE",value,confidence,evidenceCount:3,verifiedEvidenceCount:2,
  lastUpdated:"2026-10-03T00:00:00.000Z",uncertainty:100-confidence,
  supportingEvidence:[`evidence:${dimension}`],missingEvidence:[],
});

const draft=buildStateDraft({
  ventureId:"venture-1",modelVersionId:"model-v1",
  dimensionResults:[
    available("PROBLEM_MARKET",72,80),
    available("PRODUCT",65,75),
    available("VALIDATION_PMF",54,60),
  ],
  capturedAt:new Date("2026-10-03T00:00:00.000Z"),
});
assert.equal(draft.stateVector.PROBLEM_MARKET,72);
assert.equal(draft.stateVector.TEAM,null);
assert.equal(draft.quality.coverage,37.5);
assert.equal(draft.quality.evidenceCount,9);
assert.equal(draft.quality.verifiedEvidenceCount,6);
assert.ok(draft.quality.missingDimensions.includes("TEAM"));
assert.ok(draft.fingerprint.startsWith("fnv1a-"));

const changed=buildStateDraft({
  ventureId:"venture-1",modelVersionId:"model-v1",
  dimensionResults:[available("PROBLEM_MARKET",80,85),available("PRODUCT",65,75),available("VALIDATION_PMF",54,60)],
  previousState:draft.stateVector,
});
assert.ok(Array.isArray(changed.delta));
assert.ok((changed.delta as any[]).some(x=>x.path==="PROBLEM_MARKET"));

const unchanged=buildStateDraft({
  ventureId:"venture-1",modelVersionId:"model-v1",
  dimensionResults:[available("PROBLEM_MARKET",72,80),available("PRODUCT",65,75),available("VALIDATION_PMF",54,60)],
  previousState:draft.stateVector,
  capturedAt:new Date("2026-10-04T00:00:00.000Z"),
});
assert.equal(unchanged.fingerprint,draft.fingerprint);

const writes:any[]=[];
const repository:any={
  ventureExists:async()=>true,
  createEvidence:async(input:any)=>{writes.push(input);return {...input,id:"e-1",verificationStatus:input.verificationStatus??"UNVERIFIED",createdAt:new Date(),updatedAt:new Date()}},
  listEvidence:async()=>[],
};
const evidence=new EvidenceService(repository);
await evidence.add({
  ventureId:"venture-1",type:"INTERVIEW",nature:"FACT",source:"founder-interview",
  collectedAt:new Date("2026-10-03"),value:{answer:"pain confirmed"},confidence:70,
  provenance:{actorId:"user-1",capturedMethod:"manual"},createdById:"user-1",
});
assert.equal(writes.length,1);

await assert.rejects(
  ()=>evidence.add({ventureId:"venture-1",type:"SYSTEM_GENERATED",nature:"FACT",source:"state-engine",collectedAt:new Date(),value:80,provenance:{algorithm:"state"}}),
  (error:any)=>error instanceof VentureEvidenceError&&error.code==="DERIVED_PRIMARY_EVIDENCE",
);
await assert.rejects(
  ()=>evidence.add({ventureId:"venture-1",type:"INTERVIEW",nature:"FACT",source:"test",collectedAt:new Date(),value:true,confidence:101,provenance:{}}),
  (error:any)=>error instanceof VentureEvidenceError&&error.code==="INVALID_CONFIDENCE",
);

console.log("Venture Intelligence foundation tests passed");
