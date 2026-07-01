-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('follow', 'collaborate', 'mentor');

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL DEFAULT 'follow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConnection_fromUserId_idx" ON "UserConnection"("fromUserId");

-- CreateIndex
CREATE INDEX "UserConnection_toUserId_idx" ON "UserConnection"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_fromUserId_toUserId_key" ON "UserConnection"("fromUserId", "toUserId");

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
