import type {CreateVentureEvidenceInput,VentureEvidenceRecord} from "../domain/types";
import type {VentureIntelligenceRepository} from "../repositories/venture-intelligence-repository";

export class VentureEvidenceError extends Error{
  constructor(public code:"VENTURE_NOT_FOUND"|"INVALID_CONFIDENCE"|"INVALID_PERIOD"|"DERIVED_PRIMARY_EVIDENCE",message:string){super(message)}
}

export class EvidenceService{
  constructor(private readonly repository:VentureIntelligenceRepository){}

  async add(input:CreateVentureEvidenceInput):Promise<VentureEvidenceRecord>{
    if(!(await this.repository.ventureExists(input.ventureId)))throw new VentureEvidenceError("VENTURE_NOT_FOUND","Venture not found");
    if(input.confidence!=null&&(input.confidence<0||input.confidence>100))throw new VentureEvidenceError("INVALID_CONFIDENCE","confidence must be between 0 and 100");
    if(input.periodStart&&input.periodEnd&&input.periodStart>input.periodEnd)throw new VentureEvidenceError("INVALID_PERIOD","periodStart cannot be after periodEnd");
    if(input.type==="SYSTEM_GENERATED"&&input.nature==="FACT")throw new VentureEvidenceError("DERIVED_PRIMARY_EVIDENCE","System-generated derived intelligence cannot be recorded as primary fact evidence");
    return this.repository.createEvidence(input);
  }

  async list(ventureId:string){return this.repository.listEvidence(ventureId)}
}
