CREATE TABLE "WorkAssignment" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "workType" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "dueAt" TIMESTAMP(3),
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkAssignment_ventureId_memberId_workType_workId_key" ON "WorkAssignment"("ventureId","memberId","workType","workId");
CREATE INDEX "WorkAssignment_ventureId_workType_idx" ON "WorkAssignment"("ventureId","workType");
CREATE INDEX "WorkAssignment_memberId_status_idx" ON "WorkAssignment"("memberId","status");
CREATE INDEX "WorkAssignment_dueAt_idx" ON "WorkAssignment"("dueAt");
ALTER TABLE "WorkAssignment" ADD CONSTRAINT "WorkAssignment_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkAssignment" ADD CONSTRAINT "WorkAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "VentureMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
