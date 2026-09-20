-- CreateTable
CREATE TABLE "InterventionLearning" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "problemSignature" TEXT NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "actionTitle" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "outcomeStatus" TEXT NOT NULL,
    "outcomeDelta" DOUBLE PRECISION,
    "effectiveness" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "evidence" TEXT[],
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionLearning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterventionLearning_interventionId_key" ON "InterventionLearning"("interventionId");
CREATE INDEX "InterventionLearning_ownerId_problemSignature_idx" ON "InterventionLearning"("ownerId", "problemSignature");
CREATE INDEX "InterventionLearning_ownerId_targetMetric_idx" ON "InterventionLearning"("ownerId", "targetMetric");
CREATE INDEX "InterventionLearning_ownerId_effectiveness_idx" ON "InterventionLearning"("ownerId", "effectiveness");
