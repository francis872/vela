import assert from "node:assert/strict";import {buildFundraisingPlan} from "../src/lib/fundraising-intelligence";
const base={revenue:100,cogs:40,operatingCosts:100,cash:120,customers:10};
const r=buildFundraisingPlan(base,{targetRunwayMonths:18,minimumCashBufferMonths:2,equityOffered:10,productPct:25,technologyPct:25,marketPct:35,operationsPct:15,revenueGrowthTargetPct:50,customerGrowthTargetPct:40});
assert.equal(r.monthlyNeed,40);assert.equal(r.targetRaise,680);assert.equal(r.useOfFunds.reduce((s,x)=>s+x.amount,0),680);assert.equal(r.deal.postMoney,6800);assert.equal(r.deal.preMoney,6120);assert.equal(r.milestones.length,3);assert.ok(["URGENT","PREPARE_NOW","PLAN_NOW","MONITOR","NOT_REQUIRED"].includes(r.timing));
const noBurn=buildFundraisingPlan({revenue:200,cogs:20,operatingCosts:50,cash:1000},{targetRunwayMonths:18,productPct:25,technologyPct:25,marketPct:25,operationsPct:25});assert.equal(noBurn.targetRaise,0);
console.log("Fundraising Intelligence tests passed");