CREATE TABLE "DashboardThresholdConfig" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'default',
  "ievHealthy" INTEGER NOT NULL DEFAULT 70,
  "ievWarning" INTEGER NOT NULL DEFAULT 50,
  "confidenceHealthy" INTEGER NOT NULL DEFAULT 75,
  "confidenceWarning" INTEGER NOT NULL DEFAULT 50,
  "averageFailureRiskHealthyMax" INTEGER NOT NULL DEFAULT 35,
  "averageFailureRiskWarningMax" INTEGER NOT NULL DEFAULT 55,
  "highRiskShareHealthyMax" INTEGER NOT NULL DEFAULT 20,
  "highRiskShareWarningMax" INTEGER NOT NULL DEFAULT 40,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DashboardThresholdConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardThresholdConfig_key_key" ON "DashboardThresholdConfig"("key");