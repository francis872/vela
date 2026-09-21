-- Algorithm Learning: per-owner adaptive parameters and auditable recommendation outcomes.
CREATE TABLE "AlgorithmProfile" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "priorityWeights" JSONB NOT NULL,
  "riskAttenuation" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
  "rbfSigma" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
  "optimizerRiskPenalty" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "optimizerCapacityPenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "optimizerEvaporation" DOUBLE PRECISION NOT NULL DEFAULT 0.88,
  "optimizerExploration" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
  "learningRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
  "sampleCount" INTEGER NOT NULL DEFAULT 0,
  "lastLearnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlgorithmProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlgorithmProfile_ownerId_key" ON "AlgorithmProfile"("ownerId");
CREATE INDEX "AlgorithmProfile_sampleCount_idx" ON "AlgorithmProfile"("sampleCount");

CREATE TABLE "AlgorithmRun" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "algorithmSet" TEXT NOT NULL,
  "recommendations" JSONB NOT NULL,
  "parameters" JSONB NOT NULL,
  "context" JSONB NOT NULL,
  "outcomeScore" DOUBLE PRECISION,
  "outcome" JSONB,
  "observedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlgorithmRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlgorithmRun_ownerId_signature_key" ON "AlgorithmRun"("ownerId","signature");
CREATE INDEX "AlgorithmRun_ownerId_createdAt_idx" ON "AlgorithmRun"("ownerId","createdAt");
CREATE INDEX "AlgorithmRun_ownerId_observedAt_idx" ON "AlgorithmRun"("ownerId","observedAt");
