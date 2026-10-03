import type {CreateVentureEvidenceInput,VentureEvidenceRecord,VentureStateDraft,VentureDimensionAssessment} from "../domain/types";

export interface VentureIntelligenceRepository {
  ventureExists(ventureId:string):Promise<boolean>;
  createEvidence(input:CreateVentureEvidenceInput):Promise<VentureEvidenceRecord>;
  listEvidence(ventureId:string):Promise<VentureEvidenceRecord[]>;
  getLatestCompletedDimensionResults(ventureId:string):Promise<{
    evaluationId:string;
    modelVersionId:string;
    dimensions:VentureDimensionAssessment[];
  }|null>;
  getLatestStateSnapshot(ventureId:string):Promise<{
    id:string;
    sequence:number;
    fingerprint:string;
    stateVector:unknown;
    capturedAt:Date;
  }|null>;
  saveStateSnapshot(input:VentureStateDraft & {sequence:number}):Promise<{id:string;sequence:number;fingerprint:string;capturedAt:Date}>;
}
