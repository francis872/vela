-- CreateTable
CREATE TABLE "VenturePulseSnapshot" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "velocity" INTEGER,
    "validation" INTEGER,
    "risk" INTEGER,
    "readiness" INTEGER,
    "sprintCompletion" INTEGER,
    "trajectoryStatus" TEXT NOT NULL,
    "commandStatus" TEXT NOT NULL,
    "commandPriority" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenturePulseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VenturePulseSnapshot_ownerId_bucket_key" ON "VenturePulseSnapshot"("ownerId", "bucket");

-- CreateIndex
CREATE INDEX "VenturePulseSnapshot_ownerId_capturedAt_idx" ON "VenturePulseSnapshot"("ownerId", "capturedAt");

-- CreateIndex
CREATE INDEX "VenturePulseSnapshot_capturedAt_idx" ON "VenturePulseSnapshot"("capturedAt");
