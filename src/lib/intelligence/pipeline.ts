import {buildState,captureState} from "../state/state-engine";
import type {StateScope} from "../state/state";
import {extractFeatureVector} from "../features/feature-engine";
import {analyzeProbability} from "../probability/probability-engine";
import {analyzeAnomalies} from "../anomaly/anomaly-engine";
import {analyzeVentureGraph} from "../graph/graph-intelligence";
import {analyzeGeospatial} from "../geospatial/geospatial-intelligence";
import {optimizeAllocation} from "../optimization/allocation";
import {createVentureTwin} from "../digital-twin/venture-twin";
import {simulateVentureScenario} from "../digital-twin/scenario-engine";
import {analyzePortfolio} from "../portfolio/portfolio-intelligence";
import {explainResult} from "../explainability/explanation";
import {retrieveLearningMemory} from "../learning/memory";
import {governanceStatus} from "../governance/governance-engine";
import type {EvidenceItem} from "../explainability/evidence";

export const COMPUTATIONAL_PIPELINE_VERSION="VELA_COMPUTATIONAL_PIPELINE_V1";

export type PipelineRequest={
  scope:StateScope;
  subjectId?:string;
  captureState?:boolean;
  probability?:{feature?:string;values?:number[];queryValue?:number};
  anomaly?:{mode:"univariate"|"temporal"|"multivariate";values?:number[];rows?:number[][];options?:Record<string,number>};
  graph?:{sources?:{nodeId:string;value:number;label?:string}[]};
  geospatial?:any;
  optimization?:any;
  digitalTwin?:{changes:any[];assumptions?:Record<string,number>};
  portfolio?:{ventures:any[];options?:any};
  learning?:{signature?:string;targetMetric?:string;limit?:number};
  governance?:{family?:string};
};

type StageResult={status:"OK"|"SKIPPED"|"INSUFFICIENT_DATA"|"ERROR";data?:unknown;reason?:string};

function ok(data:unknown):StageResult{return{status:"OK",data}}
function skipped(reason:string):StageResult{return{status:"SKIPPED",reason}}
function insufficient(reason:string,data?:unknown):StageResult{return{status:"INSUFFICIENT_DATA",reason,data}}
function failed(error:unknown):StageResult{return{status:"ERROR",reason:error instanceof Error?error.message:String(error)}}

export async function runComputationalPipeline(ownerId:string,req:PipelineRequest){
  const stages:Record<string,StageResult>={};
  const state=await buildState(req.scope,ownerId,req.subjectId);
  if(!state)return{status:"UNAVAILABLE" as const,version:COMPUTATIONAL_PIPELINE_VERSION,scope:req.scope,stages:{state:insufficient("State subject was not found or is not accessible.")}};
  stages.state=ok(state);

  if(req.captureState){
    try{stages.snapshot=ok(await captureState(state,ownerId,req.scope==="portfolio"?state.subjectId:null))}
    catch(e){stages.snapshot=failed(e)}
  }else stages.snapshot=skipped("captureState=false");

  let features:any=null;
  try{features=extractFeatureVector(state as any);stages.features=features.coverage.available?ok(features):insufficient("No numeric features available.",features)}
  catch(e){stages.features=failed(e)}

  if(req.probability){
    try{
      const vals=req.probability.values??(req.probability.feature&&features?.vector?.[req.probability.feature]!=null?[features.vector[req.probability.feature]]:[]);
      const result=analyzeProbability(vals,req.probability.queryValue);
      stages.probability=result.status==="AVAILABLE"?ok(result):insufficient("Probability requires at least three numeric observations.",result);
    }catch(e){stages.probability=failed(e)}
  }else stages.probability=skipped("No probability request.");

  if(req.anomaly){
    try{const result=analyzeAnomalies(req.anomaly as any);stages.anomaly=(result as any).status==="INSUFFICIENT_DATA"?insufficient("Insufficient anomaly data.",result):ok(result)}
    catch(e){stages.anomaly=failed(e)}
  }else stages.anomaly=skipped("No anomaly request.");

  if(req.scope==="venture"){
    try{const g=await analyzeVentureGraph(ownerId,req.graph?.sources??[]);stages.graph=g?ok(g):insufficient("Venture graph unavailable.")}
    catch(e){stages.graph=failed(e)}
  }else stages.graph=skipped("Graph stage currently applies to venture scope.");

  if(req.geospatial){
    try{const g=analyzeGeospatial(req.geospatial,req.geospatial.options);stages.geospatial=g.status==="AVAILABLE"?ok(g):insufficient("No geospatial evidence.",g)}
    catch(e){stages.geospatial=failed(e)}
  }else stages.geospatial=skipped("No geospatial payload.");

  if(req.optimization){
    try{stages.optimization=ok(optimizeAllocation(req.optimization))}
    catch(e){stages.optimization=failed(e)}
  }else stages.optimization=skipped("No optimization payload.");

  if(req.digitalTwin&&req.scope==="venture"){
    try{
      const twin=createVentureTwin(state as any);
      stages.digitalTwin=ok(simulateVentureScenario(twin,req.digitalTwin.changes??[],req.digitalTwin.assumptions??{}));
    }catch(e){stages.digitalTwin=failed(e)}
  }else stages.digitalTwin=skipped(req.scope!=="venture"?"Digital Twin requires venture scope.":"No digital twin scenario.");

  if(req.portfolio){
    try{const p=analyzePortfolio(req.portfolio.ventures??[],req.portfolio.options);stages.portfolio=p.status==="AVAILABLE"?ok(p):insufficient("Portfolio analysis lacks sufficient comparable ventures.",p)}
    catch(e){stages.portfolio=failed(e)}
  }else stages.portfolio=skipped("No portfolio payload.");

  if(req.learning){
    try{stages.learning=ok(await retrieveLearningMemory(ownerId,req.learning))}
    catch(e){stages.learning=failed(e)}
  }else stages.learning=skipped("No learning-memory request.");

  try{stages.governance=ok(await governanceStatus(ownerId,req.governance?.family??"COMPUTATIONAL_INTELLIGENCE"))}
  catch(e){stages.governance=failed(e)}

  const evidence:EvidenceItem[]=[];
  if(features){
    evidence.push({id:"state",label:"Canonical state available",kind:"observed",source:"StateEngine",observedAt:state.capturedAt,reliability:state.quality.confidence,value:state.subjectId});
    evidence.push({id:"features",label:`${features.coverage.available} computed features`,kind:"derived",source:"FeatureEngine",observedAt:features.generatedAt,reliability:Math.min(100,features.coverage.ratio),value:features.coverage});
  }
  const successful=Object.values(stages).filter(s=>s.status==="OK").length,total=Object.values(stages).filter(s=>s.status!=="SKIPPED").length;
  const explanation=explainResult({value:{successfulStages:successful,evaluatedStages:total,scope:req.scope,subjectId:state.subjectId},evidence,requiredEvidence:["state","features"],assumptions:[],algorithm:"VELA_COMPUTATIONAL_PIPELINE",version:COMPUTATIONAL_PIPELINE_VERSION,stateConfidence:state.quality.confidence,consistency:total?successful/total*100:100,summary:"Computational Intelligence pipeline execution summary."});
  return{status:"AVAILABLE" as const,version:COMPUTATIONAL_PIPELINE_VERSION,scope:req.scope,subjectId:state.subjectId,stages,explanation};
}
