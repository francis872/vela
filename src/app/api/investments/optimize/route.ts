import {NextRequest,NextResponse} from "next/server";
import {requireAuth} from "@/lib/api-auth";
import {prisma} from "@/lib/prisma";
import {buildState} from "@/lib/intelligence/state/state-engine";
import {createVentureTwin} from "@/lib/intelligence/digital-twin/venture-twin";
import {optimizeInvestmentStrategy} from "@/lib/investments/investment-strategy-optimizer";
import {simulateInvestmentStrategyOnVenture} from "@/lib/investments/investment-digital-twin";

export async function POST(req:NextRequest){
  const auth=await requireAuth(req);
  if(!auth.ok)return auth.response;
  const body=await req.json().catch(()=>({}));
  const budget=Number(body.budget);
  if(!Number.isFinite(budget)||budget<=0)return NextResponse.json({error:"positive budget is required"},{status:400});

  const rows=await prisma.investmentOpportunity.findMany({
    where:{ownerId:auth.session.sub,status:{not:"archived"}},
    orderBy:{updatedAt:"desc"}
  });
  const eligible=rows.filter(o=>
    o.capitalRequired!=null&&o.expectedReturn!=null&&o.liquidity!=null&&
    o.strategicFit!=null&&o.marketPotential!=null&&o.riskExposure!=null
  );
  if(!eligible.length)return NextResponse.json({
    status:"INSUFFICIENT_DATA",
    missing:"At least one opportunity needs capitalRequired, expectedReturn, liquidity, strategicFit, marketPotential and riskExposure."
  },{status:422});

  const optimization=optimizeInvestmentStrategy(eligible.map(o=>({
    id:o.id,title:o.title,capitalRequired:o.capitalRequired!,expectedReturn:o.expectedReturn!,
    liquidity:o.liquidity!,strategicFit:o.strategicFit!,marketPotential:o.marketPotential!,riskExposure:o.riskExposure!
  })),{
    budget,
    maxPerOpportunity:body.constraints?.maxPerOpportunity,
    minLiquidity:body.constraints?.minLiquidity,
    maxRisk:body.constraints?.maxRisk,
    minStrategicFit:body.constraints?.minStrategicFit
  },body.objectives??{},body.options??{});

  let digitalTwin:null|{status:string;strategies?:unknown[];reason?:string}=null;
  if(body.simulateDigitalTwin){
    const state=await buildState("venture",auth.session.sub);
    if(state){
      const twin=createVentureTwin(state as any);
      digitalTwin={
        status:"AVAILABLE",
        strategies:optimization.strategies.slice(0,Math.max(1,Math.min(10,Number(body.simulationLimit??5)))).map(strategy=>
          simulateInvestmentStrategyOnVenture(twin,strategy,budget,body.twinAssumptions??{})
        )
      };
    }else digitalTwin={status:"INSUFFICIENT_DATA",reason:"No venture state is available for Digital Twin simulation."};
  }

  return NextResponse.json({
    status:"AVAILABLE",
    version:"INVESTMENT_STRATEGY_PIPELINE_V1",
    eligibleOpportunities:eligible.length,
    excludedOpportunities:rows.length-eligible.length,
    optimization,
    digitalTwin,
    explanation:"GWO generates Pareto-efficient capital allocation candidates from recorded opportunity evidence. Digital Twin effects are simulated only when explicit propagation assumptions are supplied."
  });
}
