import assert from "node:assert/strict";import {forecastFinancials,investorQuestions} from "../src/lib/financial-forecasting";
const a=forecastFinancials({revenue:100,cogs:30,operatingCosts:40,cash:500},{months:12,revenueGrowth:3,costGrowth:2,volatility:.05,simulations:500,seed:872});
const b=forecastFinancials({revenue:100,cogs:30,operatingCosts:40,cash:500},{months:12,revenueGrowth:3,costGrowth:2,volatility:.05,simulations:500,seed:872});
assert.deepEqual(a,b);assert.ok(a.terminalRevenue.p10<=a.terminalRevenue.p50);assert.ok(a.terminalRevenue.p50<=a.terminalRevenue.p90);assert.ok(a.probabilityPositiveEbitda>=0&&a.probabilityPositiveEbitda<=100);
const room=investorQuestions({revenue:100},{metrics:{grossMargin:60,ebitda:30,cac:10,ltvCac:4},range:{midpoint:1000}},2,1);assert.equal(room.total,8);assert.equal(room.ready,8);
console.log("Financial forecasting tests passed");