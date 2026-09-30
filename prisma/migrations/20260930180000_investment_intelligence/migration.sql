CREATE TABLE "InvestmentOpportunity" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "thesis" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'screening',
  "sector" TEXT,
  "geography" TEXT,
  "capitalRequired" DOUBLE PRECISION,
  "expectedReturn" DOUBLE PRECISION,
  "timeHorizonMonths" INTEGER,
  "liquidity" DOUBLE PRECISION,
  "strategicFit" DOUBLE PRECISION,
  "marketPotential" DOUBLE PRECISION,
  "executionComplexity" DOUBLE PRECISION,
  "riskExposure" DOUBLE PRECISION,
  "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "committeeDecision" TEXT,
  "decisionRationale" TEXT,
  "decidedAt" TIMESTAMP(3),
  "actualReturn" DOUBLE PRECISION,
  "outcomeStatus" TEXT,
  "monitoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvestmentOpportunity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InvestmentReview" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "summary" TEXT,
  "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "missing" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "assumptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "confidence" DOUBLE PRECISION,
  "analysis" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvestmentReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvestmentOpportunity_ownerId_status_idx" ON "InvestmentOpportunity"("ownerId","status");
CREATE INDEX "InvestmentOpportunity_ownerId_type_idx" ON "InvestmentOpportunity"("ownerId","type");
CREATE INDEX "InvestmentOpportunity_ownerId_createdAt_idx" ON "InvestmentOpportunity"("ownerId","createdAt");
CREATE INDEX "InvestmentReview_ownerId_opportunityId_idx" ON "InvestmentReview"("ownerId","opportunityId");
CREATE INDEX "InvestmentReview_ownerId_stage_status_idx" ON "InvestmentReview"("ownerId","stage","status");
