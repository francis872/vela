import assert from "node:assert/strict";
import { DEFAULT_GOVERNED_PARAMETERS } from "../src/lib/algorithm-governance";

assert.equal(DEFAULT_GOVERNED_PARAMETERS.riskAttenuation, 0.65);
assert.equal(DEFAULT_GOVERNED_PARAMETERS.rbfSigma, 0.35);
assert.ok(DEFAULT_GOVERNED_PARAMETERS.optimizerRiskPenalty > 0);
const weightTotal=Object.values(DEFAULT_GOVERNED_PARAMETERS.priorityWeights).reduce((a,b)=>a+b,0);
assert.ok(Math.abs(weightTotal-1)<0.0001);
assert.ok(DEFAULT_GOVERNED_PARAMETERS.learningRate<=0.12);
console.log("Algorithm governance invariant tests passed");
