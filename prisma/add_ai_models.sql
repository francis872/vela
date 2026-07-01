-- ─── AI Intelligence & Memory System ──────────────────────────────────────────

model AIModel {
  id                String            @id @default(cuid())
  name              String            // llama, mistral, etc.
  provider          String            // ollama, openai, huggingface
  baseUrl           String?           // http://localhost:11434 for Ollama
  apiKey            String?           // encrypted in production
  modelId           String            // model identifier
  contextWindow     Int               @default(2048) // tokens
  maxTokensOutput   Int               @default(1024)
  temperature       Float             @default(0.7)
  topP              Float             @default(0.95)
  isActive          Boolean           @default(true)
  isDefault         Boolean           @default(false)
  costPerToken      Float?            // for cloud models
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  conversations     AIConversation[]
  memories          AIMemory[]

  @@index([provider])
  @@index([isActive])
}

// Core Memory System for AI Models
model AIMemory {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation("AIMemories", fields: [userId], references: [id], onDelete: Cascade)
  modelId           String
  model             AIModel           @relation(fields: [modelId], references: [id], onDelete: Cascade)
  
  // Memory classification
  type              String            // context, pattern, insight, rule, user_preference
  category          String            // diagnostic, objective, pattern, user_behavior
  
  // Content
  key               String            // searchable identifier
  content           String            @db.Text
  metadata          String?           @db.Text // JSON: { importance: 0-1, relevance: [], tags: [] }
  
  // Importance & Decay
  importance        Float             @default(0.5) // 0-1 scale
  accessCount       Int               @default(0)
  lastAccessedAt    DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  expiresAt         DateTime?         // auto-forget after period

  @@unique([userId, modelId, key])
  @@index([userId])
  @@index([modelId])
  @@index([type])
  @@index([category])
  @@index([importance])
}

// Conversation Tracking for Learning
model AIConversation {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation("AIConversations", fields: [userId], references: [id], onDelete: Cascade)
  modelId           String
  model             AIModel           @relation(fields: [modelId], references: [id], onDelete: Cascade)
  
  // Context
  module            String            // vela_guide, bizzu, diagnostics
  topic             String?           // user-facing topic
  title             String?
  
  // Messages
  messages          String            @db.Text // JSON array of {role, content, timestamp}
  messageCount      Int               @default(0)
  totalTokens       Int               @default(0)
  
  // Outcomes
  resolution        String?           @db.Text // final resolution or action taken
  satisfaction      Int?              // 1-5
  helpful           Boolean?
  
  // Tracking
  startedAt         DateTime          @default(now())
  completedAt       DateTime?
  duration          Int?              // seconds
  
  @@index([userId])
  @@index([modelId])
  @@index([module])
  @@index([startedAt])
}

// Data Cache & Query Optimization
model DataCache {
  id                String            @id @default(cuid())
  cacheKey          String            @unique
  module            String
  dataType          String            // ventures, diagnostics, objectives, etc.
  
  // Cache content
  value             String            @db.Text // JSON
  metadata          String?           @db.Text
  
  // Performance
  hitCount          Int               @default(0)
  bytesSize         Int
  computeTimeMs     Int?
  
  // Lifecycle
  createdAt         DateTime          @default(now())
  lastAccessedAt    DateTime?
  expiresAt         DateTime
  
  @@index([module])
  @@index([dataType])
  @@index([expiresAt])
}

// Real-time Connections (WebSocket sessions)
model RealtimeConnection {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation("RealtimeConnections", fields: [userId], references: [id], onDelete: Cascade)
  
  sessionId         String            @unique
  connectionType    String            // websocket, sse, polling
  module            String            // vela, bizzu, guide, etc.
  
  // Connection tracking
  isActive          Boolean           @default(true)
  lastHeartbeat     DateTime          @default(now())
  messagesReceived  Int               @default(0)
  messagesSent      Int               @default(0)
  
  createdAt         DateTime          @default(now())
  disconnectedAt    DateTime?
  
  @@index([userId])
  @@index([module])
  @@index([isActive])
  @@index([lastHeartbeat])
}

// AI Processing Queue (for async operations)
model AIProcessingQueue {
  id                String            @id @default(cuid())
  userId            String
  user              User              @relation("AIProcessingQueues", fields: [userId], references: [id], onDelete: Cascade)
  
  // Task definition
  taskType          String            // analyze_diagnostic, generate_plan, etc.
  module            String            // vela_guide, bizzu, etc.
  input             String            @db.Text // JSON
  
  // Model selection
  modelId           String?
  priority          Int               @default(0)
  
  // Status
  status            String            @default("pending") // pending, processing, completed, failed
  result            String?           @db.Text // JSON
  error             String?
  
  // Performance
  startedAt         DateTime?
  completedAt       DateTime?
  processingTimeMs  Int?
  
  @@index([userId])
  @@index([taskType])
  @@index([status])
  @@index([priority, createdAt])
}

// Platform-wide AI Statistics
model AIStatistics {
  id                String            @id @default(cuid())
  date              DateTime
  module            String
  
  // Usage
  totalRequests     Int               @default(0)
  successfulRequests Int              @default(0)
  failedRequests    Int               @default(0)
  
  // Performance
  avgResponseTimeMs Float             @default(0)
  avgTokensPerRequest Float           @default(0)
  totalTokensUsed   Int               @default(0)
  
  // Cost (if applicable)
  estimatedCost     Float?
  
  createdAt         DateTime          @default(now())
  
  @@unique([date, module])
  @@index([date])
  @@index([module])
}

// Update User model with relations
extend User {
  aiMemories                AIMemory[]            @relation("AIMemories")
  aiConversations           AIConversation[]      @relation("AIConversations")
  realtimeConnections       RealtimeConnection[]  @relation("RealtimeConnections")
  aiProcessingQueues        AIProcessingQueue[]   @relation("AIProcessingQueues")
}
