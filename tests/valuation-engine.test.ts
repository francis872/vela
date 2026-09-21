import assert from "node:assert/strict";
import { analyzeFinancials,valueVenture } from "../src/lib/valuation-engine";

const metrics=analyzeFinancials({revenue:100,cogs:40,operatingCosts:30,cash:300,customers:10,newCustomers:2,marketingSpend:20,churnRate:5});
assert.equal(metrics.grossProfit,60);
assert.equal(metrics.grossMargin,60);
assert.equal(metrics.ebitda,30);
assert.equal(metrics.runwayMonths,null);
assert.equal(metrics.cac,10);
assert.ok((metrics.ltv??0)>0);

const valuation=valueVenture({revenue:100,cogs:40,operatingCosts:30},{revenueMultiple:3,ebitdaMultiple:8,capitalRequested:500,equityOffered:10});
assert.equal(valuation.status,"AVAILABLE");
assert.equal(valuation.methods.length,2);
assert.equal(valuation.deal?.postMoney,5000);
assert.equal(valuation.deal?.preMoney,4500);

const insufficient=valueVenture({revenue:0,operatingCosts:10},{});
assert.equal(insufficient.status,"INSUFFICIENT_DATA");
console.log("Valuation engine tests passed");
