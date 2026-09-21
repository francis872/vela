import assert from "node:assert/strict";import {propagateCapitalScenario} from "../src/lib/capital-digital-twin";
const base={revenue:100,cogs:30,operatingCosts:50,cash:100,customers:10,newCustomers:2,marketingSpend:20,churnRate:5};
const r=propagateCapitalScenario(base,{capitalRaise:500,equityOffered:10,revenueChangePct:20,customerChangePct:10,cacChangePct:-20,monthlyHiringCost:10},{months:12,revenueGrowth:3,costGrowth:2,volatility:.05,simulations:200,seed:872,revenueMultiple:3});
assert.equal(r.scenario.revenue,120);assert.equal(r.delta.cash,500);assert.equal(r.scenario.customers,11);assert.equal(r.valuation.deal?.postMoney,5000);assert.ok(r.forecast.terminalRevenue.p10<=r.forecast.terminalRevenue.p90);
assert.equal(base.revenue,100);console.log("Capital Digital Twin tests passed");