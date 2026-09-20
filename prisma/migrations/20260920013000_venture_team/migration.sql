CREATE TABLE "VentureMember" (
  "id" TEXT NOT NULL,
  "ventureId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "responsibility" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentureMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VentureMember_ventureId_userId_key" ON "VentureMember"("ventureId", "userId");
CREATE INDEX "VentureMember_ventureId_status_idx" ON "VentureMember"("ventureId", "status");
CREATE INDEX "VentureMember_userId_idx" ON "VentureMember"("userId");
CREATE INDEX "VentureMember_role_idx" ON "VentureMember"("role");
ALTER TABLE "VentureMember" ADD CONSTRAINT "VentureMember_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentureMember" ADD CONSTRAINT "VentureMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
