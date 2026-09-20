ALTER TABLE "Decision"
  ADD COLUMN "expectedOutcome" TEXT,
  ADD COLUMN "evidence" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "reviewAt" TIMESTAMP(3),
  ADD COLUMN "outcomeStatus" TEXT,
  ADD COLUMN "learnedAt" TIMESTAMP(3);

CREATE INDEX "Decision_reviewAt_idx" ON "Decision"("reviewAt");
CREATE INDEX "Decision_outcomeStatus_idx" ON "Decision"("outcomeStatus");
