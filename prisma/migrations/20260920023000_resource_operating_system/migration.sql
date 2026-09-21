ALTER TABLE "SpaceResource"
  ADD COLUMN "ventureId" TEXT,
  ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'knowledge',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN "criticality" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "monthlyCost" DOUBLE PRECISION,
  ADD COLUMN "ownerMemberId" TEXT,
  ADD COLUMN "usageStatus" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "SpaceResource_ventureId_status_idx" ON "SpaceResource"("ventureId","status");
CREATE INDEX "SpaceResource_resourceType_idx" ON "SpaceResource"("resourceType");

CREATE TABLE "ResourceAllocation" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "workType" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "workTitle" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResourceAllocation_resourceId_ventureId_workType_workId_key" ON "ResourceAllocation"("resourceId","ventureId","workType","workId");
CREATE INDEX "ResourceAllocation_ventureId_status_idx" ON "ResourceAllocation"("ventureId","status");
CREATE INDEX "ResourceAllocation_workType_workId_idx" ON "ResourceAllocation"("workType","workId");
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SpaceResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
