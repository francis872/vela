-- AlterTable
ALTER TABLE "Objective" ADD COLUMN     "ventureId" TEXT;

-- CreateTable
CREATE TABLE "WaitlistSignup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "ventureName" TEXT NOT NULL,
    "sector" TEXT,
    "stage" TEXT,
    "monthlyRevenue" DOUBLE PRECISION,
    "mainNeed" TEXT,
    "populationTag" TEXT,
    "interestedInBeta" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "description" TEXT,
    "yearsOperating" INTEGER NOT NULL DEFAULT 0,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "customers" TEXT,
    "monthlyRevenue" DOUBLE PRECISION DEFAULT 0,
    "monthlyCosts" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnostic" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "problem" TEXT,
    "targetCustomers" TEXT,
    "businessModel" TEXT,
    "marketing" TEXT,
    "financials" TEXT,
    "organization" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticAnalysis" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "maturityScore" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "validations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "days30Plan" TEXT,
    "days60Plan" TEXT,
    "days90Plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUser" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortVenture" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortVenture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementMetric" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT,
    "cohortId" TEXT,
    "registeredAt" TIMESTAMP(3),
    "diagnosticStartedAt" TIMESTAMP(3),
    "diagnosticCompletedAt" TIMESTAMP(3),
    "firstObjectiveAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "day7Active" BOOLEAN NOT NULL DEFAULT false,
    "day30Active" BOOLEAN NOT NULL DEFAULT false,
    "week3Active" BOOLEAN NOT NULL DEFAULT false,
    "objectivesCreated" INTEGER NOT NULL DEFAULT 0,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "businessInfoUpdated" BOOLEAN NOT NULL DEFAULT false,
    "recommendationsViewed" INTEGER NOT NULL DEFAULT 0,
    "recommendationsApplied" INTEGER NOT NULL DEFAULT 0,
    "recommendationExamples" TEXT,
    "satisfactionScore" INTEGER,
    "wouldRecommend" BOOLEAN,
    "clarityImprovement" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistSignup_email_key" ON "WaitlistSignup"("email");

-- CreateIndex
CREATE INDEX "WaitlistSignup_email_idx" ON "WaitlistSignup"("email");

-- CreateIndex
CREATE INDEX "WaitlistSignup_status_idx" ON "WaitlistSignup"("status");

-- CreateIndex
CREATE INDEX "WaitlistSignup_createdAt_idx" ON "WaitlistSignup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Venture_userId_key" ON "Venture"("userId");

-- CreateIndex
CREATE INDEX "Venture_userId_idx" ON "Venture"("userId");

-- CreateIndex
CREATE INDEX "Venture_stage_idx" ON "Venture"("stage");

-- CreateIndex
CREATE INDEX "Diagnostic_ventureId_idx" ON "Diagnostic"("ventureId");

-- CreateIndex
CREATE INDEX "Diagnostic_status_idx" ON "Diagnostic"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticAnalysis_diagnosticId_key" ON "DiagnosticAnalysis"("diagnosticId");

-- CreateIndex
CREATE INDEX "DiagnosticAnalysis_diagnosticId_idx" ON "DiagnosticAnalysis"("diagnosticId");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Organization_city_idx" ON "Organization"("city");

-- CreateIndex
CREATE INDEX "OrganizationUser_organizationId_idx" ON "OrganizationUser"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationUser_userId_idx" ON "OrganizationUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUser_organizationId_userId_key" ON "OrganizationUser"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Cohort_organizationId_idx" ON "Cohort"("organizationId");

-- CreateIndex
CREATE INDEX "Cohort_status_idx" ON "Cohort"("status");

-- CreateIndex
CREATE INDEX "CohortVenture_cohortId_idx" ON "CohortVenture"("cohortId");

-- CreateIndex
CREATE INDEX "CohortVenture_ventureId_idx" ON "CohortVenture"("ventureId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortVenture_cohortId_ventureId_key" ON "CohortVenture"("cohortId", "ventureId");

-- CreateIndex
CREATE INDEX "EngagementMetric_ventureId_idx" ON "EngagementMetric"("ventureId");

-- CreateIndex
CREATE INDEX "EngagementMetric_cohortId_idx" ON "EngagementMetric"("cohortId");

-- CreateIndex
CREATE INDEX "Objective_ventureId_idx" ON "Objective"("ventureId");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venture" ADD CONSTRAINT "Venture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticAnalysis" ADD CONSTRAINT "DiagnosticAnalysis_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortVenture" ADD CONSTRAINT "CohortVenture_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortVenture" ADD CONSTRAINT "CohortVenture_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementMetric" ADD CONSTRAINT "EngagementMetric_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
