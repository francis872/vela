-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceEvidence" TEXT[],
    "targetMetric" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION,
    "targetDelta" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "actionTitle" TEXT NOT NULL,
    "actionHref" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "outcomeValue" DOUBLE PRECISION,
    "outcomeDelta" DOUBLE PRECISION,
    "outcomeStatus" TEXT,
    "outcomeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intervention_ownerId_status_idx" ON "Intervention"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Intervention_ownerId_createdAt_idx" ON "Intervention"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Intervention_deadline_idx" ON "Intervention"("deadline");
