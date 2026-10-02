import test from "node:test";
import assert from "node:assert/strict";
import { capabilitiesFor, hasCapability } from "../src/lib/capabilities";
import type { AccessContext } from "../src/lib/access-context";

function venture(role:string):AccessContext{return{scope:"venture",scopeId:"v1",userId:"u1",membership:{kind:"venture",id:"m1",role,status:"active"}};}
test("operator can collaborate but cannot manage team",{ },()=>{const c=venture("operator");assert.equal(hasCapability(c,"venture.objectives.write"),true);assert.equal(hasCapability(c,"venture.validation.write"),true);assert.equal(hasCapability(c,"venture.resources.write"),true);assert.equal(hasCapability(c,"venture.team.manage"),false);});
test("member cannot delete canonical evidence/objectives",()=>{const c=venture("member");assert.equal(hasCapability(c,"venture.objectives.delete"),false);assert.equal(hasCapability(c,"venture.validation.delete"),false);});
test("advisor is read only",()=>{const c=venture("advisor");assert.equal(hasCapability(c,"venture.read"),true);assert.equal(hasCapability(c,"venture.objectives.write"),false);assert.equal(hasCapability(c,"venture.validation.write"),false);});
test("unknown role has no capabilities",()=>assert.deepEqual(capabilitiesFor(venture("custom-super-admin")),[]));
