-- CreateTable
CREATE TABLE "DomainEventRecord" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aggregate" TEXT,
    "aggregateId" TEXT,
    "payload" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEventRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomainEventRecord_ownerId_occurredAt_idx" ON "DomainEventRecord"("ownerId", "occurredAt");
CREATE INDEX "DomainEventRecord_name_occurredAt_idx" ON "DomainEventRecord"("name", "occurredAt");
CREATE INDEX "DomainEventRecord_aggregate_aggregateId_idx" ON "DomainEventRecord"("aggregate", "aggregateId");
