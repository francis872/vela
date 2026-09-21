CREATE TABLE "FinancialSnapshot" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'COP',
  "revenue" DOUBLE PRECISION NOT NULL,
  "cogs" DOUBLE PRECISION,
  "operatingCosts" DOUBLE PRECISION NOT NULL,
  "cash" DOUBLE PRECISION,
  "debt" DOUBLE PRECISION,
  "customers" INTEGER,
  "newCustomers" INTEGER,
  "marketingSpend" DOUBLE PRECISION,
  "churnRate" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialSnapshot_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialSnapshot_ventureId_period_key" ON "FinancialSnapshot"("ventureId","period");
CREATE INDEX "FinancialSnapshot_ventureId_period_idx" ON "FinancialSnapshot"("ventureId","period");

CREATE TABLE "ValuationCase" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'COP',
  "capitalRequested" DOUBLE PRECISION,
  "equityOffered" DOUBLE PRECISION,
  "revenueMultiple" DOUBLE PRECISION,
  "ebitdaMultiple" DOUBLE PRECISION,
  "discountRate" DOUBLE PRECISION,
  "terminalGrowth" DOUBLE PRECISION,
  "projectedGrowth" DOUBLE PRECISION,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ValuationCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ValuationCase_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ValuationCase_ventureId_createdAt_idx" ON "ValuationCase"("ventureId","createdAt");
