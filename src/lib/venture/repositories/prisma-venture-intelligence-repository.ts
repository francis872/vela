import {prisma} from "@/lib/prisma";
import type {VentureIntelligenceRepository} from "./venture-intelligence-repository";
import type {CreateVentureEvidenceInput,VentureEvidenceRecord,VentureDimensionAssessment,VentureStateDraft,VentureDimension} from "../domain/types";

function evidenceRow(row:any):VentureEvidenceRecord{
  return {
    id:row.id,ventureId:row.ventureId,type:row.type,nature:row.nature,source:row.source,
    sourceReference:row.sourceReference,collectedAt:row.collectedAt,periodStart:row.periodStart,
    periodEnd:row.periodEnd,value:row.value,unit:row.unit,confidence:row.confidence,
    verificationStatus:row.verificationStatus,metadata:row.metadata,provenance:row.provenance,
    createdById:row.createdById,createdAt:row.createdAt,updatedAt:row.updatedAt,
  };
}

export class PrismaVentureIntelligenceRepository implements VentureIntelligenceRepository{
  async ventureExists(ventureId:string){return (await prisma.venture.count({where:{id:ventureId}}))>0}

  async createEvidence(input:CreateVentureEvidenceInput){
    const row=await prisma.ventureEvidence.create({data:{
      ventureId:input.ventureId,type:input.type,nature:input.nature,source:input.source,
      sourceReference:input.sourceReference??null,collectedAt:input.collectedAt,
      periodStart:input.periodStart??null,periodEnd:input.periodEnd??null,value:input.value as any,
      unit:input.unit??null,confidence:input.confidence??null,
      verificationStatus:input.verificationStatus??"UNVERIFIED",metadata:(input.metadata??undefined) as any,
      provenance:input.provenance as any,createdById:input.createdById??null,
    }});
    return evidenceRow(row);
  }

  async listEvidence(ventureId:string){
    const rows=await prisma.ventureEvidence.findMany({where:{ventureId},orderBy:{collectedAt:"desc"}});
    return rows.map(evidenceRow);
  }

  async getLatestCompletedDimensionResults(ventureId:string){
    const evaluation=await prisma.ventureEvaluation.findFirst({
      where:{ventureId,status:"COMPLETED"},
      orderBy:{completedAt:"desc"},
      include:{dimensionResults:true},
    });
    if(!evaluation)return null;
    return {
      evaluationId:evaluation.id,
      modelVersionId:evaluation.modelVersionId,
      dimensions:evaluation.dimensionResults.map((d:any):VentureDimensionAssessment=>({
        dimension:d.dimension as VentureDimension,
        status:d.status==="AVAILABLE"?"AVAILABLE":"INSUFFICIENT_EVIDENCE",
        value:d.value,confidence:d.confidence,evidenceCount:d.evidenceCount,
        verifiedEvidenceCount:d.verifiedEvidenceCount,lastUpdated:d.lastUpdated?.toISOString()??null,
        uncertainty:d.uncertainty,supportingEvidence:Array.isArray(d.supportingEvidence)?d.supportingEvidence:[],
        missingEvidence:Array.isArray(d.missingEvidence)?d.missingEvidence:[],
      })),
    };
  }

  async getLatestStateSnapshot(ventureId:string){
    return prisma.ventureStateSnapshot.findFirst({
      where:{ventureId},orderBy:{sequence:"desc"},
      select:{id:true,sequence:true,fingerprint:true,stateVector:true,capturedAt:true},
    });
  }

  async saveStateSnapshot(input:VentureStateDraft & {sequence:number}){
    return prisma.ventureStateSnapshot.create({data:{
      ventureId:input.ventureId,evaluationId:input.evaluationId??null,modelVersionId:input.modelVersionId,
      sequence:input.sequence,stateVector:input.stateVector as any,dimensions:input.dimensions as any,
      quality:input.quality as any,delta:(input.delta??undefined) as any,fingerprint:input.fingerprint,
      capturedAt:input.capturedAt,
    },select:{id:true,sequence:true,fingerprint:true,capturedAt:true}});
  }
}
