-- CreateTable
CREATE TABLE "InspirePost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspirePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT 'Recurso',
    "url" TEXT,
    "authorName" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InspirePost_createdAt_idx" ON "InspirePost"("createdAt");

-- CreateIndex
CREATE INDEX "InspirePost_ownerId_idx" ON "InspirePost"("ownerId");

-- CreateIndex
CREATE INDEX "SpaceResource_ownerId_idx" ON "SpaceResource"("ownerId");

-- CreateIndex
CREATE INDEX "SpaceResource_tag_idx" ON "SpaceResource"("tag");

-- CreateIndex
CREATE INDEX "SpaceResource_createdAt_idx" ON "SpaceResource"("createdAt");
