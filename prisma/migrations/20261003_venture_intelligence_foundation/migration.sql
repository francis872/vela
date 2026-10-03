-- VELA Venture Intelligence 2.14 — Domain Foundation
-- PostgreSQL remains the canonical operational source of truth.

CREATE TYPE "VentureEvidenceType" AS ENUM ('SELF_REPORTED','SYSTEM_GENERATED','FINANCIAL','PRODUCT_ANALYTICS','CRM','SURVEY','INTERVIEW','EXPERIMENT','DOCUMENT','EXTERNAL','VERIFIED_EXTERNAL');
CREATE TYPE "VentureEvidenceNature" AS ENUM ('FACT','ESTIMATE','ASSUMPTION','HYPOTHESIS','PREDICTION','RECOMMENDATION');
CREATE TYPE "VentureEvidenceVerificationStatus" AS ENUM ('UNVERIFIED','PENDING','VERIFIED','REJECTED');
CREATE TYPE "VentureDimensionCode" AS ENUM ('PROBLEM_MARKET','PRODUCT','VALIDATION_PMF','TRACTION','BUSINESS_MODEL','TEAM','EXECUTION','CAPITAL_RISK');
CREATE TYPE "VentureEvaluationStatus" AS ENUM ('DRAFT','IN_PROGRESS','COMPLETED','INSUFFICIENT_EVIDENCE','FAILED');

CREATE TABLE "VentureEvidence" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "type" "VentureEvidenceType" NOT NULL,
  "nature" "VentureEvidenceNature" NOT NULL,
  "source" TEXT NOT NULL,
  "sourceReference" TEXT,
  "collectedAt" TIMESTAMP(3) NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "value" JSONB NOT NULL,
  "unit" TEXT,
  "confidence" DOUBLE PRECISION,
  "verificationStatus" "VentureEvidenceVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "metadata" JSONB,
  "provenance" JSONB NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureEvaluationModel" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureEvaluationModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureEvaluationModelVersion" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "description" TEXT,
  "configuration" JSONB,
  "activatedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureEvaluationModelVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureDimensionDefinition" (
  "id" TEXT NOT NULL,
  "modelVersionId" TEXT NOT NULL,
  "code" "VentureDimensionCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "weight" DOUBLE PRECISION,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureDimensionDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureIndicatorDefinition" (
  "id" TEXT NOT NULL,
  "dimensionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "valueType" TEXT NOT NULL DEFAULT 'number',
  "unit" TEXT,
  "weight" DOUBLE PRECISION,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "evidenceTypes" "VentureEvidenceType"[] DEFAULT ARRAY[]::"VentureEvidenceType"[],
  "rule" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureIndicatorDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureEvaluation" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "modelVersionId" TEXT NOT NULL,
  "status" "VentureEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
  "requestedById" TEXT,
  "summary" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureDimensionResult" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "dimension" "VentureDimensionCode" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'INSUFFICIENT_EVIDENCE',
  "value" DOUBLE PRECISION,
  "confidence" DOUBLE PRECISION,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "verifiedEvidenceCount" INTEGER NOT NULL DEFAULT 0,
  "uncertainty" DOUBLE PRECISION,
  "lastUpdated" TIMESTAMP(3),
  "explanation" TEXT,
  "supportingEvidence" JSONB,
  "drivers" JSONB,
  "counterSignals" JSONB,
  "missingEvidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureDimensionResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentureStateSnapshot" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "evaluationId" TEXT,
  "modelVersionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "stateVector" JSONB NOT NULL,
  "dimensions" JSONB NOT NULL,
  "quality" JSONB NOT NULL,
  "delta" JSONB,
  "fingerprint" TEXT NOT NULL,
  "sourceEventId" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VentureStateSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VentureEvaluationModel_key_key" ON "VentureEvaluationModel"("key");
CREATE UNIQUE INDEX "VentureEvaluationModelVersion_modelId_version_key" ON "VentureEvaluationModelVersion"("modelId","version");
CREATE UNIQUE INDEX "VentureDimensionDefinition_modelVersionId_code_key" ON "VentureDimensionDefinition"("modelVersionId","code");
CREATE UNIQUE INDEX "VentureIndicatorDefinition_dimensionId_key_key" ON "VentureIndicatorDefinition"("dimensionId","key");
CREATE UNIQUE INDEX "VentureDimensionResult_evaluationId_dimension_key" ON "VentureDimensionResult"("evaluationId","dimension");
CREATE UNIQUE INDEX "VentureStateSnapshot_ventureId_sequence_key" ON "VentureStateSnapshot"("ventureId","sequence");
CREATE UNIQUE INDEX "VentureStateSnapshot_ventureId_fingerprint_key" ON "VentureStateSnapshot"("ventureId","fingerprint");

CREATE INDEX "VentureEvidence_ventureId_collectedAt_idx" ON "VentureEvidence"("ventureId","collectedAt");
CREATE INDEX "VentureEvidence_ventureId_type_idx" ON "VentureEvidence"("ventureId","type");
CREATE INDEX "VentureEvidence_ventureId_nature_idx" ON "VentureEvidence"("ventureId","nature");
CREATE INDEX "VentureEvidence_verificationStatus_idx" ON "VentureEvidence"("verificationStatus");
CREATE INDEX "VentureEvidence_source_idx" ON "VentureEvidence"("source");
CREATE INDEX "VentureEvaluationModelVersion_status_idx" ON "VentureEvaluationModelVersion"("status");
CREATE INDEX "VentureEvaluationModelVersion_activatedAt_idx" ON "VentureEvaluationModelVersion"("activatedAt");
CREATE INDEX "VentureDimensionDefinition_modelVersionId_sortOrder_idx" ON "VentureDimensionDefinition"("modelVersionId","sortOrder");
CREATE INDEX "VentureIndicatorDefinition_dimensionId_idx" ON "VentureIndicatorDefinition"("dimensionId");
CREATE INDEX "VentureEvaluation_ventureId_createdAt_idx" ON "VentureEvaluation"("ventureId","createdAt");
CREATE INDEX "VentureEvaluation_modelVersionId_status_idx" ON "VentureEvaluation"("modelVersionId","status");
CREATE INDEX "VentureDimensionResult_dimension_status_idx" ON "VentureDimensionResult"("dimension","status");
CREATE INDEX "VentureStateSnapshot_ventureId_capturedAt_idx" ON "VentureStateSnapshot"("ventureId","capturedAt");
CREATE INDEX "VentureStateSnapshot_modelVersionId_capturedAt_idx" ON "VentureStateSnapshot"("modelVersionId","capturedAt");

ALTER TABLE "VentureEvidence" ADD CONSTRAINT "VentureEvidence_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureEvaluationModelVersion" ADD CONSTRAINT "VentureEvaluationModelVersion_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VentureEvaluationModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureDimensionDefinition" ADD CONSTRAINT "VentureDimensionDefinition_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "VentureEvaluationModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureIndicatorDefinition" ADD CONSTRAINT "VentureIndicatorDefinition_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "VentureDimensionDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureEvaluation" ADD CONSTRAINT "VentureEvaluation_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureEvaluation" ADD CONSTRAINT "VentureEvaluation_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "VentureEvaluationModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VentureDimensionResult" ADD CONSTRAINT "VentureDimensionResult_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "VentureEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureStateSnapshot" ADD CONSTRAINT "VentureStateSnapshot_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureStateSnapshot" ADD CONSTRAINT "VentureStateSnapshot_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "VentureEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VentureStateSnapshot" ADD CONSTRAINT "VentureStateSnapshot_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "VentureEvaluationModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
