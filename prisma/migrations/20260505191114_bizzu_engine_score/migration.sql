-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('active', 'completed', 'blocked');

-- CreateTable
CREATE TABLE "StartupProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "problem" TEXT,
    "solution" TEXT,
    "targetMarket" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'idea',
    "teamDescription" TEXT,
    "revenueModel" TEXT,
    "mainChallenge" TEXT,
    "nextGoal" TEXT,
    "vision" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartupProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sprintId" TEXT NOT NULL,

    CONSTRAINT "SprintItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderScore" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "execution" INTEGER NOT NULL DEFAULT 0,
    "results" INTEGER NOT NULL DEFAULT 0,
    "collaboration" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "outcome" TEXT,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StartupProfile_ownerId_key" ON "StartupProfile"("ownerId");

-- CreateIndex
CREATE INDEX "StartupProfile_ownerId_idx" ON "StartupProfile"("ownerId");

-- CreateIndex
CREATE INDEX "Sprint_ownerId_idx" ON "Sprint"("ownerId");

-- CreateIndex
CREATE INDEX "Sprint_status_idx" ON "Sprint"("status");

-- CreateIndex
CREATE INDEX "SprintItem_sprintId_idx" ON "SprintItem"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "FounderScore_ownerId_key" ON "FounderScore"("ownerId");

-- CreateIndex
CREATE INDEX "FounderScore_ownerId_idx" ON "FounderScore"("ownerId");

-- CreateIndex
CREATE INDEX "Decision_ownerId_idx" ON "Decision"("ownerId");

-- CreateIndex
CREATE INDEX "Decision_createdAt_idx" ON "Decision"("createdAt");

-- AddForeignKey
ALTER TABLE "SprintItem" ADD CONSTRAINT "SprintItem_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
