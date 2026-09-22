CREATE TABLE "CapitalDeployment" (
"id" TEXT NOT NULL,"ventureId" TEXT NOT NULL,"fundraisingPlanId" TEXT NOT NULL,"category" TEXT NOT NULL,"title" TEXT NOT NULL,"plannedAmount" DOUBLE PRECISION NOT NULL,"committedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,"spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,"status" TEXT NOT NULL DEFAULT 'planned',"workType" TEXT,"workId" TEXT,"memberId" TEXT,"resourceId" TEXT,"milestone" TEXT,"expectedOutcome" TEXT,"actualOutcome" TEXT,"outcomeValue" DOUBLE PRECISION,"roi" DOUBLE PRECISION,"learning" TEXT,"committedAt" TIMESTAMP(3),"spentAt" TIMESTAMP(3),"closedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "CapitalDeployment_pkey" PRIMARY KEY ("id"),
CONSTRAINT "CapitalDeployment_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT "CapitalDeployment_fundraisingPlanId_fkey" FOREIGN KEY ("fundraisingPlanId") REFERENCES "FundraisingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "CapitalDeployment_ventureId_status_idx" ON "CapitalDeployment"("ventureId","status");
CREATE INDEX "CapitalDeployment_fundraisingPlanId_category_idx" ON "CapitalDeployment"("fundraisingPlanId","category");
CREATE INDEX "CapitalDeployment_workType_workId_idx" ON "CapitalDeployment"("workType","workId");
CREATE INDEX "CapitalDeployment_memberId_idx" ON "CapitalDeployment"("memberId");
CREATE INDEX "CapitalDeployment_resourceId_idx" ON "CapitalDeployment"("resourceId");