/**
 * Ollama Intelligence Engine
 * Central AI motor for VELA Guide, Bizzu, Diagnostics
 * Features:
 * - Streaming responses
 * - Memory integration
 * - Auto-caching
 * - Error recovery
 */

import { prisma } from './prisma';

export interface AIRequest {
  userId: string;
  module: string;
  topic?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  useMemory?: boolean;
  cacheKey?: string;
}

export interface AIResponse {
  content: string;
  tokens: number;
  cached?: boolean;
  memoryUpdated?: boolean;
  conversationId?: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const DEFAULT_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '1024');
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600'); // 1 hour

/**
 * Get or initialize default Ollama model
 */
async function getDefaultModel() {
  let model = await prisma.aIModel.findFirst({
    where: { isDefault: true, isActive: true }
  });
  
  if (!model) {
    model = await prisma.aIModel.create({
      data: {
        name: 'LLaMA 3',
        provider: 'ollama',
        baseUrl: OLLAMA_BASE_URL,
        modelId: OLLAMA_MODEL,
        isDefault: true,
        isActive: true,
        contextWindow: 4096,
        maxTokensOutput: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      }
    });
  }
  
  return model;
}

/**
 * Check cache before calling Ollama
 */
async function checkCache(cacheKey: string): Promise<string | null> {
  if (!cacheKey) return null;
  
  const cached = await prisma.dataCache.findUnique({
    where: { cacheKey }
  });
  
  if (cached && cached.expiresAt > new Date()) {
    // Update hit count
    await prisma.dataCache.update({
      where: { id: cached.id },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date()
      }
    });
    
    return cached.value;
  }
  
  return null;
}

/**
 * Save response to cache
 */
async function saveToCache(cacheKey: string, value: string, module: string, dataType: string) {
  if (!cacheKey) return;
  
  const expiresAt = new Date(Date.now() + CACHE_TTL * 1000);
  
  await prisma.dataCache.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      module,
      dataType,
      value,
      bytesSize: Buffer.byteLength(value),
      expiresAt
    },
    update: {
      value,
      bytesSize: Buffer.byteLength(value),
      expiresAt,
      hitCount: { increment: 1 }
    }
  });
}

/**
 * Query memory for relevant context
 */
async function queryMemory(userId: string, modelId: string, context: string): Promise<string[]> {
  const memories = await prisma.aIMemory.findMany({
    where: {
      userId,
      modelId,
      importance: { gte: 0.3 }
    },
    orderBy: {
      importance: 'desc'
    },
    take: 5
  });
  
  // Update access count
  for (const memory of memories) {
    await prisma.aIMemory.update({
      where: { id: memory.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date()
      }
    });
  }
  
  return memories.map(m => m.content);
}

/**
 * Save memory from conversation
 */
async function saveMemory(
  userId: string,
  modelId: string,
  type: string,
  category: string,
  key: string,
  content: string,
  importance: number = 0.5
) {
  await prisma.aIMemory.upsert({
    where: {
      userId_modelId_key: { userId, modelId, key }
    },
    create: {
      userId,
      modelId,
      type,
      category,
      key,
      content,
      importance,
      accessCount: 1
    },
    update: {
      content,
      importance,
      accessCount: { increment: 1 },
      updatedAt: new Date()
    }
  });
}

/**
 * Main function: Stream from Ollama with memory integration
 */
export async function ollamaStream(request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const model = await getDefaultModel();
  
  // Try cache first
  if (request.cacheKey) {
    const cached = await checkCache(request.cacheKey);
    if (cached) {
      return {
        content: cached,
        tokens: 0,
        cached: true
      };
    }
  }
  
  // Inject memory context if enabled
  let messages = [...request.messages];
  if (request.useMemory) {
    const memoryContext = await queryMemory(request.userId, model.id, request.topic || '');
    if (memoryContext.length > 0) {
      messages = [
        {
          role: 'system',
          content: `You have access to relevant context: ${memoryContext.join(' | ')}`
        },
        ...messages
      ];
    }
  }
  
  try {
    // Call Ollama with streaming
    const response = await fetch(`${model.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.modelId,
        messages,
        stream: false,
        options: {
          temperature: request.temperature ?? model.temperature,
          num_predict: request.maxTokens ?? model.maxTokensOutput,
          top_p: model.topP
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.message.content;
    const tokens = data.eval_count || 0;
    
    // Save to cache if requested
    if (request.cacheKey) {
      await saveToCache(request.cacheKey, content, request.module, 'ai_response');
    }
    
    // Extract and save insights to memory
    if (request.useMemory && request.topic) {
      const insightMatch = content.match(/insight|key|important|pattern/i);
      if (insightMatch) {
        await saveMemory(
          request.userId,
          model.id,
          'insight',
          request.module,
          `${request.module}_${request.topic}_${Date.now()}`,
          content,
          Math.min(0.8, tokens / 100)
        );
      }
    }
    
    // Log conversation
    const conversation = await prisma.aIConversation.create({
      data: {
        userId: request.userId,
        modelId: model.id,
        module: request.module,
        topic: request.topic,
        messages: JSON.stringify(messages),
        messageCount: messages.length,
        totalTokens: tokens,
        resolution: content
      }
    });
    
    // Update statistics
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const responseTime = Date.now() - startTime;
    
    // Get existing stats to calculate proper average
    const existingStats = await prisma.aIStatistics.findUnique({
      where: { date_module: { date: new Date(dateKey), module: request.module } }
    });
    
    if (existingStats) {
      const newAvg = (existingStats.avgResponseTimeMs + responseTime) / 2;
      await prisma.aIStatistics.update({
        where: { date_module: { date: new Date(dateKey), module: request.module } },
        data: {
          totalRequests: { increment: 1 },
          successfulRequests: { increment: 1 },
          totalTokensUsed: { increment: tokens },
          avgResponseTimeMs: newAvg
        }
      });
    } else {
      await prisma.aIStatistics.create({
        data: {
          date: new Date(dateKey),
          module: request.module,
          totalRequests: 1,
          successfulRequests: 1,
          totalTokensUsed: tokens,
          avgResponseTimeMs: responseTime
        }
      });
    }
    
    return {
      content,
      tokens,
      memoryUpdated: request.useMemory,
      conversationId: conversation.id
    };
    
  } catch (error) {
    console.error('Ollama error:', error);
    
    // Log failure
    const dateKey = new Date().toISOString().split('T')[0];
    await prisma.aIStatistics.upsert({
      where: { date_module: { date: new Date(dateKey), module: request.module } },
      create: {
        date: new Date(dateKey),
        module: request.module,
        totalRequests: 1,
        failedRequests: 1
      },
      update: {
        totalRequests: { increment: 1 },
        failedRequests: { increment: 1 }
      }
    });
    
    throw error;
  }
}

/**
 * Queue async AI task
 */
export async function queueAITask(
  userId: string,
  taskType: string,
  module: string,
  input: any,
  priority: number = 0
) {
  return prisma.aIProcessingQueue.create({
    data: {
      userId,
      taskType,
      module,
      input: JSON.stringify(input),
      priority,
      status: 'pending'
    }
  });
}

/**
 * Process queued AI tasks
 */
export async function processAIQueue() {
  const queued = await prisma.aIProcessingQueue.findMany({
    where: { status: 'pending' },
    orderBy: [{ priority: 'desc' }, { id: 'asc' }],
    take: 5
  });
  
  for (const task of queued) {
    try {
      await prisma.aIProcessingQueue.update({
        where: { id: task.id },
        data: { status: 'processing', startedAt: new Date() }
      });
      
      const input = JSON.parse(task.input);
      
      // Process based on taskType
      let result = {};
      if (task.taskType === 'analyze_diagnostic') {
        // Call Ollama for diagnostic analysis
        const response = await ollamaStream({
          userId: task.userId,
          module: task.module,
          messages: [
            { role: 'system', content: 'Analyze this business diagnostic comprehensively.' },
            { role: 'user', content: JSON.stringify(input) }
          ],
          useMemory: true,
          cacheKey: `diagnostic_${input.ventureId}`
        });
        result = { analysis: response.content };
      }
      
      await prisma.aIProcessingQueue.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          result: JSON.stringify(result),
          completedAt: new Date(),
          processingTimeMs: Date.now() - (task.startedAt?.getTime() || 0)
        }
      });
      
    } catch (error) {
      await prisma.aIProcessingQueue.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          error: (error as Error).message,
          completedAt: new Date(),
          processingTimeMs: Date.now() - (task.startedAt?.getTime() || 0)
        }
      });
    }
  }
}
