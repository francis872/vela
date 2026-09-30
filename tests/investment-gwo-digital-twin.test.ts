import assert from "node:assert/strict";
import {optimizeInvestmentStrategy} from "../src/lib/investments/investment-strategy-optimizer";
import {simulateInvestmentStrategyOnVenture} from "../src/lib/investments/investment-digital-twin";

const opportunities=[
{id:"a",title:"Operating business",capitalRequired:600,expectedReturn:22,liquidity:65,strategicFit:90,marketPotential:85,riskExposure:45},
{id:"b",title:"Expansion project",capitalRequired:500,expectedReturn:18,liquidity:80,strategicFit:75,marketPotential:72,riskExposure:28},
{id:"c",title:"Private investment",capitalRequired:400,expectedReturn:27,liquidity:40,strategicFit:60,marketPotential:78,riskExposure:62}
];
const optimized=optimizeInvestmentStrategy(opportunities,{budget:800,maxRisk:60,minLiquidity:35},{returnWeight:1,riskWeight:1},{seed:872,runs:7,iterations:22,wolves:20});
assert.equal(optimized.version,"INVESTMENT_GWO_V1");
assert.ok(optimized.strategies.length>0);
for(const s of optimized.strategies){assert.ok(s.capitalDeployed<=800.000001);assert.ok(s.objectives.riskExposure<=60.000001)}

const state:any={scope:"venture",subjectId:"v1",capturedAt:"2026-09-30T00:00:00.000Z",version:"STATE_V1",quality:{completeness:1,confidence:1},state:{identity:{id:"v1",name:"V",sector:"tech",stage:"growth",yearsOperating:2,teamSize:10},execution:{objectives:{total:5,blocked:1,atRisk:1,completed:2},assignments:{active:3,totalWeight:5},resources:{activeAllocations:2}},validation:{signals:4},financial:{latestSnapshot:null},risk:{latestAssessment:null,openSignals:1},capital:{latestScenario:null,latestFundraisingPlan:null},pulse:{velocity:50,validation:55,risk:40,readiness:60,sprintCompletion:70,trajectoryStatus:"stable",capturedAt:"2026-09-30T00:00:00.000Z"}}};
const twin={version:"DIGITAL_TWIN_V1",subjectId:"v1",createdAt:state.capturedAt,baselineCapturedAt:state.capturedAt,baseline:state.state,working:JSON.parse(JSON.stringify(state.state)),mutations:[]};
const simulation=simulateInvestmentStrategyOnVenture(twin,optimized.strategies[0],800,{velocityPerCapitalPct:.05,riskPerPortfolioRiskPct:5});
assert.equal(simulation.version,"INVESTMENT_DIGITAL_TWIN_V1");
assert.ok(simulation.simulation.mutations.length>0);
assert.equal(twin.working.pulse.velocity,50);
console.log("Investment GWO + Digital Twin tests passed");
