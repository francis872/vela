import {compareStates,stateFingerprint} from "@/lib/intelligence/state/state";
import {VENTURE_DIMENSIONS,type VentureDimensionAssessment,type VentureStateDraft,type VentureStateVector} from "../domain/types";
import type {VentureIntelligenceRepository} from "../repositories/venture-intelligence-repository";

export const VENTURE_STATE_ENGINE_VERSION="VENTURE_STATE_ENGINE_V1";

function emptyDimension(dimension:typeof VENTURE_DIMENSIONS[number]):VentureDimensionAssessment{
  return {dimension,status:"INSUFFICIENT_EVIDENCE",value:null,confidence:null,evidenceCount:0,verifiedEvidenceCount:0,lastUpdated:null,uncertainty:null,supportingEvidence:[],missingEvidence:["No completed evaluation result available"]};
}

export function buildStateDraft(input:{
  ventureId:string;modelVersionId:string;evaluationId?:string|null;
  dimensionResults:VentureDimensionAssessment[];previousState?:unknown;capturedAt?:Date;
}):VentureStateDraft{
  const byDimension=new Map(input.dimensionResults.map(x=>[x.dimension,x]));
  const dimensions=Object.fromEntries(VENTURE_DIMENSIONS.map(d=>[d,byDimension.get(d)??emptyDimension(d)])) as Record<typeof VENTURE_DIMENSIONS[number],VentureDimensionAssessment>;
  const stateVector=Object.fromEntries(VENTURE_DIMENSIONS.map(d=>[d,dimensions[d].status==="AVAILABLE"?dimensions[d].value:null])) as VentureStateVector;
  const all=Object.values(dimensions);
  const evidenceCount=all.reduce((s,d)=>s+d.evidenceCount,0);
  const verifiedEvidenceCount=all.reduce((s,d)=>s+d.verifiedEvidenceCount,0);
  const available=all.filter(d=>d.status==="AVAILABLE"&&d.value!=null);
  const confidence=available.length?Math.round(available.reduce((s,d)=>s+(d.confidence??0),0)/available.length*100)/100:null;
  const missingDimensions=all.filter(d=>d.status!=="AVAILABLE"||d.value==null).map(d=>d.dimension);
  const coverage=Math.round((VENTURE_DIMENSIONS.length-missingDimensions.length)/VENTURE_DIMENSIONS.length*10000)/100;
  const delta=input.previousState==null?null:compareStates(input.previousState,stateVector);
  const fingerprint=stateFingerprint({modelVersionId:input.modelVersionId,stateVector,dimensions});
  return {ventureId:input.ventureId,modelVersionId:input.modelVersionId,evaluationId:input.evaluationId??null,stateVector,dimensions,quality:{evidenceCount,verifiedEvidenceCount,coverage,confidence,missingDimensions},delta,fingerprint,capturedAt:input.capturedAt??new Date()};
}

export class VentureStateEngine{
  constructor(private readonly repository:VentureIntelligenceRepository){}

  async calculateAndPersist(ventureId:string){
    if(!(await this.repository.ventureExists(ventureId)))return {status:"VENTURE_NOT_FOUND" as const};
    const evaluated=await this.repository.getLatestCompletedDimensionResults(ventureId);
    if(!evaluated)return {status:"INSUFFICIENT_EVIDENCE" as const,missing:"completed_evaluation"};
    const previous=await this.repository.getLatestStateSnapshot(ventureId);
    const draft=buildStateDraft({
      ventureId,modelVersionId:evaluated.modelVersionId,evaluationId:evaluated.evaluationId,
      dimensionResults:evaluated.dimensions,previousState:previous?.stateVector,
    });
    if(previous?.fingerprint===draft.fingerprint)return {status:"UNCHANGED" as const,snapshot:previous,draft};
    const snapshot=await this.repository.saveStateSnapshot({...draft,sequence:(previous?.sequence??0)+1});
    return {status:"CREATED" as const,snapshot,draft,engineVersion:VENTURE_STATE_ENGINE_VERSION};
  }
}
