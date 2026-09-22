import assert from "node:assert/strict";import {optimizeCapitalScenario} from "../src/lib/capital-scenario-optimizer";
const base={revenue:100,cogs:30,operatingCosts:50,cash:200,customers:10,newCustomers:2,marketingSpend:20,churnRate:5};
const assumptions={months:12,revenueGrowth:3,costGrowth:2,volatility:.03,simulations:100,seed:872,revenueMultiple:3};
const bounds={capitalRaise:[0,500],equityOffered:[5,15],revenueChangePct:[0,25],customerChangePct:[0,20],cacChangePct:[-20,5],monthlyHiringCost:[0,20],additionalMonthlyCosts:[0,10]} as any;
const constraints={maxDilution:15,minRunwayMonths:6,minPositiveEbitdaProbability:40,maxMonthlyBurn:100};
const a=optimizeCapitalScenario(base,assumptions,bounds,constraints,{iterations:8,population:12,seed:872});const b=optimizeCapitalScenario(base,assumptions,bounds,constraints,{iterations:8,population:12,seed:872});
assert.ok(a.best);assert.deepEqual(a.best?.changes,b.best?.changes);assert.ok((a.best?.changes.equityOffered??99)<=15);assert.equal(base.revenue,100);console.log("Capital Scenario Optimizer tests passed");