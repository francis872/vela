-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKey" TEXT,
    "modelId" TEXT NOT NULL,
    "contextWindow" INTEGER NOT NULL DEFAULT 2048,
    "maxTokensOutput" INTEGER NOT NULL DEFAULT 1024,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "topP" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "costPerToken" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "topic" TEXT,
    "title" TEXT,
    "messages" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "resolution" TEXT,
    "satisfaction" INTEGER,
    "helpful" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "bytesSize" INTEGER NOT NULL,
    "computeTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtimeConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "RealtimeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProcessingQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "modelId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "processingTimeMs" INTEGER,

    CONSTRAINT "AIProcessingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIStatistics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "module" TEXT NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "successfulRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTokensPerRequest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIModel_provider_idx" ON "AIModel"("provider");

-- CreateIndex
CREATE INDEX "AIModel_isActive_idx" ON "AIModel"("isActive");

-- CreateIndex
CREATE INDEX "AIMemory_userId_idx" ON "AIMemory"("userId");

-- CreateIndex
CREATE INDEX "AIMemory_modelId_idx" ON "AIMemory"("modelId");

-- CreateIndex
CREATE INDEX "AIMemory_type_idx" ON "AIMemory"("type");

-- CreateIndex
CREATE INDEX "AIMemory_category_idx" ON "AIMemory"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AIMemory_userId_modelId_key_key" ON "AIMemory"("userId", "modelId", "key");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_modelId_idx" ON "AIConversation"("modelId");

-- CreateIndex
CREATE INDEX "AIConversation_module_idx" ON "AIConversation"("module");

-- CreateIndex
CREATE INDEX "AIConversation_startedAt_idx" ON "AIConversation"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataCache_cacheKey_key" ON "DataCache"("cacheKey");

-- CreateIndex
CREATE INDEX "DataCache_module_idx" ON "DataCache"("module");

-- CreateIndex
CREATE INDEX "DataCache_dataType_idx" ON "DataCache"("dataType");

-- CreateIndex
CREATE INDEX "DataCache_expiresAt_idx" ON "DataCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RealtimeConnection_sessionId_key" ON "RealtimeConnection"("sessionId");

-- CreateIndex
CREATE INDEX "RealtimeConnection_userId_idx" ON "RealtimeConnection"("userId");

-- CreateIndex
CREATE INDEX "RealtimeConnection_module_idx" ON "RealtimeConnection"("module");

-- CreateIndex
CREATE INDEX "RealtimeConnection_isActive_idx" ON "RealtimeConnection"("isActive");

-- CreateIndex
CREATE INDEX "AIProcessingQueue_userId_idx" ON "AIProcessingQueue"("userId");

-- CreateIndex
CREATE INDEX "AIProcessingQueue_taskType_idx" ON "AIProcessingQueue"("taskType");

-- CreateIndex
CREATE INDEX "AIProcessingQueue_status_idx" ON "AIProcessingQueue"("status");

-- CreateIndex
CREATE INDEX "AIStatistics_date_idx" ON "AIStatistics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AIStatistics_date_module_key" ON "AIStatistics"("date", "module");

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtimeConnection" ADD CONSTRAINT "RealtimeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProcessingQueue" ADD CONSTRAINT "AIProcessingQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
