import type {VentureTwin} from "@/lib/intelligence/digital-twin/venture-twin";
import {simulateVentureScenario} from "@/lib/intelligence/digital-twin/scenario-engine";

export type InvestmentTwinAssumptions={
  velocityPerCapitalPct?:number;
  readinessPerStrategicFitPct?:number;
  riskPerPortfolioRiskPct?:number;
  validationPerGrowthPct?:number;
};

export function simulateInvestmentStrategyOnVenture(
  twin:VentureTwin,
  strategy:{capitalDeployed:number;objectives:{expectedReturn:number;liquidity:number;growthPotential:number;strategicFit:number;riskExposure:number}},
  budget:number,
  assumptions:InvestmentTwinAssumptions={}
){
  const deployedPct=budget>0?strategy.capitalDeployed/budget*100:0;
  const changes:any[]=[];
  const scenarioAssumptions:any={};

  if(assumptions.velocityPerCapitalPct!=null&&twin.working.pulse.velocity!=null){
    changes.push({path:"pulse.velocity",mode:"delta",value:deployedPct*assumptions.velocityPerCapitalPct,reason:"explicit capital-deployment-to-velocity assumption"});
  }
  if(assumptions.readinessPerStrategicFitPct!=null&&twin.working.pulse.readiness!=null){
    changes.push({path:"pulse.readiness",mode:"delta",value:strategy.objectives.strategicFit/100*assumptions.readinessPerStrategicFitPct,reason:"explicit strategic-fit-to-readiness assumption"});
  }
  if(assumptions.riskPerPortfolioRiskPct!=null&&twin.working.pulse.risk!=null){
    changes.push({path:"pulse.risk",mode:"delta",value:strategy.objectives.riskExposure/100*assumptions.riskPerPortfolioRiskPct,reason:"explicit portfolio-risk-to-venture-risk assumption"});
  }
  if(assumptions.validationPerGrowthPct!=null&&twin.working.pulse.validation!=null){
    changes.push({path:"pulse.validation",mode:"delta",value:strategy.objectives.growthPotential/100*assumptions.validationPerGrowthPct,reason:"explicit growth-potential-to-validation assumption"});
  }

  const simulation=simulateVentureScenario(twin,changes,scenarioAssumptions);
  return{
    version:"INVESTMENT_DIGITAL_TWIN_V1",
    strategy,
    assumptions,
    deployedPct:Math.round(deployedPct*100)/100,
    simulation,
    note:"Digital Twin effects are produced only from explicit user/system coefficients. No causal relationship is inferred from the investment strategy alone."
  };
}
