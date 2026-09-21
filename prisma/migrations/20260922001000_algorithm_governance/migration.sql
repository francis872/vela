CREATE TABLE "AlgorithmRegistry" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'challenger',
  "status" TEXT NOT NULL DEFAULT 'active',
  "parameters" JSONB NOT NULL,
  "metrics" JSONB,
  "activatedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlgorithmRegistry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlgorithmRegistry_ownerId_family_version_key" ON "AlgorithmRegistry"("ownerId","family","version");
CREATE INDEX "AlgorithmRegistry_ownerId_family_role_status_idx" ON "AlgorithmRegistry"("ownerId","family","role","status");

CREATE TABLE "AlgorithmExperiment" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "championVersion" TEXT NOT NULL,
  "challengerVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "minimumSamples" INTEGER NOT NULL DEFAULT 8,
  "promotionDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
  "rollbackDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
  "championScore" DOUBLE PRECISION,
  "challengerScore" DOUBLE PRECISION,
  "championSamples" INTEGER NOT NULL DEFAULT 0,
  "challengerSamples" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decision" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlgorithmExperiment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlgorithmExperiment_ownerId_family_status_idx" ON "AlgorithmExperiment"("ownerId","family","status");

CREATE TABLE "AlgorithmGovernanceEvent" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromVersion" TEXT,
  "toVersion" TEXT,
  "reason" TEXT NOT NULL,
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlgorithmGovernanceEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlgorithmGovernanceEvent_ownerId_family_createdAt_idx" ON "AlgorithmGovernanceEvent"("ownerId","family","createdAt");
