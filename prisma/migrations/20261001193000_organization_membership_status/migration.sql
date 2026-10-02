ALTER TABLE "OrganizationUser"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "OrganizationUser_organizationId_status_idx"
ON "OrganizationUser"("organizationId", "status");

CREATE INDEX "OrganizationUser_role_idx"
ON "OrganizationUser"("role");
