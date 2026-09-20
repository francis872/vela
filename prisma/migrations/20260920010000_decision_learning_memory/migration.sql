CREATE TABLE "DecisionLearning" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "decisionId" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "decisionTitle" TEXT NOT NULL,
  "choice" TEXT NOT NULL,
  "expectedOutcome" TEXT,
  "outcome" TEXT NOT NULL,
  "outcomeStatus" TEXT NOT NULL,
  "effectiveness" DOUBLE PRECISION NOT NULL,
  "confidence" TEXT NOT NULL,
  "lesson" TEXT NOT NULL,
  "evidence" TEXT[] NOT NULL,
  "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DecisionLearning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DecisionLearning_decisionId_key" ON "DecisionLearning"("decisionId");
CREATE INDEX "DecisionLearning_ownerId_signature_idx" ON "DecisionLearning"("ownerId", "signature");
CREATE INDEX "DecisionLearning_ownerId_outcomeStatus_idx" ON "DecisionLearning"("ownerId", "outcomeStatus");
CREATE INDEX "DecisionLearning_ownerId_effectiveness_idx" ON "DecisionLearning"("ownerId", "effectiveness");
