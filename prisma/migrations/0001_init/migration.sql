-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('admin', 'analista', 'operador');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "age" INTEGER,
    "trajectory" TEXT,
    "contact" TEXT,
    "position" TEXT,
    "bio" TEXT,
    "profileReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuickActionExecution" (
    "id" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "context" TEXT,
    "message" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickActionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BuilderExperiment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoworkingMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authorRole" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoworkingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Evaluation" (
    "id" TEXT NOT NULL,
    "monthlyRevenue" DOUBLE PRECISION NOT NULL,
    "monthlyCosts" DOUBLE PRECISION NOT NULL,
    "potentialMargin" INTEGER NOT NULL,
    "digitalization" INTEGER NOT NULL,
    "replicability" INTEGER NOT NULL,
    "differentiation" INTEGER NOT NULL,
    "iev" INTEGER NOT NULL,
    "classification" TEXT NOT NULL,
    "survivalProbability" DOUBLE PRECISION NOT NULL,
    "revenueDoubleProb" DOUBLE PRECISION NOT NULL,
    "expansionProbability" DOUBLE PRECISION NOT NULL,
    "formalizationProb" DOUBLE PRECISION NOT NULL,
    "failureRisk" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "public"."User"("active");

-- CreateIndex
CREATE INDEX "QuickActionExecution_createdAt_idx" ON "public"."QuickActionExecution"("createdAt");

-- CreateIndex
CREATE INDEX "QuickActionExecution_module_idx" ON "public"."QuickActionExecution"("module");

-- CreateIndex
CREATE INDEX "QuickActionExecution_actionKey_idx" ON "public"."QuickActionExecution"("actionKey");

-- CreateIndex
CREATE INDEX "QuickActionExecution_userId_idx" ON "public"."QuickActionExecution"("userId");

-- CreateIndex
CREATE INDEX "BuilderExperiment_createdAt_idx" ON "public"."BuilderExperiment"("createdAt");

-- CreateIndex
CREATE INDEX "BuilderExperiment_stage_idx" ON "public"."BuilderExperiment"("stage");

-- CreateIndex
CREATE INDEX "CoworkingMessage_createdAt_idx" ON "public"."CoworkingMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CoworkingMessage_authorId_idx" ON "public"."CoworkingMessage"("authorId");

-- CreateIndex
CREATE INDEX "Evaluation_createdAt_idx" ON "public"."Evaluation"("createdAt");

-- CreateIndex
CREATE INDEX "Evaluation_classification_idx" ON "public"."Evaluation"("classification");

-- AddForeignKey
ALTER TABLE "public"."QuickActionExecution" ADD CONSTRAINT "QuickActionExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

