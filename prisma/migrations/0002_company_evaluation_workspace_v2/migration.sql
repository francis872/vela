-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "businessModel" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "challengeSummary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "companyName" TEXT NOT NULL DEFAULT 'Empresa sin nombre',
ADD COLUMN     "companySector" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "companyStage" TEXT NOT NULL DEFAULT 'validation',
ADD COLUMN     "teamSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "trajectorySummary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "yearsOperating" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Evaluation_companyStage_idx" ON "Evaluation"("companyStage");

-- CreateIndex
CREATE INDEX "Evaluation_businessModel_idx" ON "Evaluation"("businessModel");

