-- CreateTable
CREATE TABLE "EcosystemContent" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "detail" TEXT,
  "meta" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seedKey" TEXT,
  "createdById" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EcosystemContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EcosystemContent_seedKey_key" ON "EcosystemContent"("seedKey");

-- CreateIndex
CREATE INDEX "EcosystemContent_module_idx" ON "EcosystemContent"("module");

-- CreateIndex
CREATE INDEX "EcosystemContent_module_category_idx" ON "EcosystemContent"("module", "category");

-- CreateIndex
CREATE INDEX "EcosystemContent_sortOrder_idx" ON "EcosystemContent"("sortOrder");
