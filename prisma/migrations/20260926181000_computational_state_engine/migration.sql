CREATE TABLE "ComputationalStateSnapshot" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "organizationId" TEXT,
  "version" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "completeness" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "state" JSONB NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComputationalStateSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ComputationalStateSnapshot_ownerId_scope_capturedAt_idx" ON "ComputationalStateSnapshot"("ownerId","scope","capturedAt");
CREATE INDEX "ComputationalStateSnapshot_scope_subjectId_capturedAt_idx" ON "ComputationalStateSnapshot"("scope","subjectId","capturedAt");
CREATE INDEX "ComputationalStateSnapshot_organizationId_capturedAt_idx" ON "ComputationalStateSnapshot"("organizationId","capturedAt");
CREATE UNIQUE INDEX "ComputationalStateSnapshot_scope_subjectId_fingerprint_key" ON "ComputationalStateSnapshot"("scope","subjectId","fingerprint");
