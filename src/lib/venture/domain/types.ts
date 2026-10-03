export const VENTURE_DIMENSIONS = [
  "PROBLEM_MARKET",
  "PRODUCT",
  "VALIDATION_PMF",
  "TRACTION",
  "BUSINESS_MODEL",
  "TEAM",
  "EXECUTION",
  "CAPITAL_RISK",
] as const;

export type VentureDimension = typeof VENTURE_DIMENSIONS[number];

export const VENTURE_EVIDENCE_TYPES = [
  "SELF_REPORTED","SYSTEM_GENERATED","FINANCIAL","PRODUCT_ANALYTICS","CRM",
  "SURVEY","INTERVIEW","EXPERIMENT","DOCUMENT","EXTERNAL","VERIFIED_EXTERNAL",
] as const;
export type VentureEvidenceType = typeof VENTURE_EVIDENCE_TYPES[number];

export const VENTURE_EVIDENCE_NATURES = [
  "FACT","ESTIMATE","ASSUMPTION","HYPOTHESIS","PREDICTION","RECOMMENDATION",
] as const;
export type VentureEvidenceNature = typeof VENTURE_EVIDENCE_NATURES[number];

export type VentureEvidenceVerificationStatus = "UNVERIFIED"|"PENDING"|"VERIFIED"|"REJECTED";

export type EvidenceProvenance = {
  actorId?: string|null;
  system?: string|null;
  algorithm?: string|null;
  algorithmVersion?: string|null;
  traceId?: string|null;
  importedFrom?: string|null;
  capturedMethod?: string|null;
};

export type CreateVentureEvidenceInput = {
  ventureId: string;
  type: VentureEvidenceType;
  nature: VentureEvidenceNature;
  source: string;
  sourceReference?: string|null;
  collectedAt: Date;
  periodStart?: Date|null;
  periodEnd?: Date|null;
  value: unknown;
  unit?: string|null;
  confidence?: number|null;
  verificationStatus?: VentureEvidenceVerificationStatus;
  metadata?: Record<string,unknown>|null;
  provenance: EvidenceProvenance;
  createdById?: string|null;
};

export type VentureEvidenceRecord = CreateVentureEvidenceInput & {
  id: string;
  verificationStatus: VentureEvidenceVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type VentureDimensionAssessment = {
  dimension: VentureDimension;
  status: "AVAILABLE"|"INSUFFICIENT_EVIDENCE";
  value: number|null;
  confidence: number|null;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  lastUpdated: string|null;
  uncertainty: number|null;
  supportingEvidence: string[];
  missingEvidence: string[];
};

export type VentureStateVector = Record<VentureDimension, number|null>;

export type VentureStateDraft = {
  ventureId: string;
  modelVersionId: string;
  evaluationId?: string|null;
  stateVector: VentureStateVector;
  dimensions: Record<VentureDimension,VentureDimensionAssessment>;
  quality: {
    evidenceCount: number;
    verifiedEvidenceCount: number;
    coverage: number;
    confidence: number|null;
    missingDimensions: VentureDimension[];
  };
  delta: unknown|null;
  fingerprint: string;
  capturedAt: Date;
};
