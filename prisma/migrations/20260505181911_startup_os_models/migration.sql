-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('active', 'completed', 'paused');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('on_track', 'at_risk', 'blocked', 'completed');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('experiment', 'interview', 'metric', 'insight');

-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM ('pending', 'passed', 'failed');

-- CreateEnum
CREATE TYPE "ThreadCategory" AS ENUM ('update', 'blocker', 'decision', 'win');

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'active',
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'on_track',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "dueDate" TIMESTAMP(3),
    "cycleId" TEXT,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "title" TEXT NOT NULL,
    "result" TEXT,
    "hypothesis" TEXT,
    "learning" TEXT,
    "objectiveId" TEXT,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "status" "GateStatus" NOT NULL DEFAULT 'pending',
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "ThreadCategory" NOT NULL DEFAULT 'update',
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" "UserRole" NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cycle_ownerId_idx" ON "Cycle"("ownerId");

-- CreateIndex
CREATE INDEX "Cycle_status_idx" ON "Cycle"("status");

-- CreateIndex
CREATE INDEX "Objective_ownerId_idx" ON "Objective"("ownerId");

-- CreateIndex
CREATE INDEX "Objective_status_idx" ON "Objective"("status");

-- CreateIndex
CREATE INDEX "Objective_cycleId_idx" ON "Objective"("cycleId");

-- CreateIndex
CREATE INDEX "Signal_ownerId_idx" ON "Signal"("ownerId");

-- CreateIndex
CREATE INDEX "Signal_type_idx" ON "Signal"("type");

-- CreateIndex
CREATE INDEX "Signal_objectiveId_idx" ON "Signal"("objectiveId");

-- CreateIndex
CREATE INDEX "Gate_ownerId_idx" ON "Gate"("ownerId");

-- CreateIndex
CREATE INDEX "Gate_status_idx" ON "Gate"("status");

-- CreateIndex
CREATE INDEX "Thread_authorId_idx" ON "Thread"("authorId");

-- CreateIndex
CREATE INDEX "Thread_category_idx" ON "Thread"("category");

-- CreateIndex
CREATE INDEX "Thread_pinned_idx" ON "Thread"("pinned");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
