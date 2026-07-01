-- CreateTable
CREATE TABLE "ObjectiveDependency" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectiveDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObjectiveDependency_ownerId_idx" ON "ObjectiveDependency"("ownerId");

-- CreateIndex
CREATE INDEX "ObjectiveDependency_objectiveId_idx" ON "ObjectiveDependency"("objectiveId");

-- CreateIndex
CREATE INDEX "ObjectiveDependency_dependsOnId_idx" ON "ObjectiveDependency"("dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveDependency_objectiveId_dependsOnId_key" ON "ObjectiveDependency"("objectiveId", "dependsOnId");

-- AddForeignKey
ALTER TABLE "ObjectiveDependency" ADD CONSTRAINT "ObjectiveDependency_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveDependency" ADD CONSTRAINT "ObjectiveDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
