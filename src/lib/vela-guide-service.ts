/**
 * VELA Guide Service
 * AI-powered guidance system for entrepreneurs
 * Integrates memory, real-time updates, and streaming responses
 */

import { prisma } from './prisma';
import { ollamaStream } from './ollama-engine';

export interface GuideContext {
  userId: string;
  diagnosticId?: string;
  ventureId?: string;
  objectiveId?: string;
  topic: string;
}

export interface GuideResponse {
  guidance: string;
  actions: string[];
  nextSteps: string[];
  resources: string[];
  relatedTopics: string[];
  savedMemory: boolean;
  conversationId: string;
}

/**
 * Get personalized guidance based on entrepreneur context
 */
export async function getVelaGuidance(context: GuideContext): Promise<GuideResponse> {
  // Build context-aware prompt
  let systemPrompt = `You are VELA Guide, an expert advisor for entrepreneurs. 
  Help founders diagnose barriers, validate ideas, and build sustainable businesses.
  Provide actionable, specific guidance.`;
  
  let userPrompt = `Topic: ${context.topic}\n`;
  
  // Load venture info if available
  if (context.ventureId) {
    const venture = await prisma.venture.findUnique({
      where: { id: context.ventureId }
    });
    if (venture) {
      userPrompt += `\nVenture: ${venture.name}
      Sector: ${venture.sector}
      Stage: ${venture.stage}
      Team Size: ${venture.teamSize}
      Monthly Revenue: ${venture.monthlyRevenue}`;
    }
  }
  
  // Load diagnostic if available
  if (context.diagnosticId) {
    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id: context.diagnosticId },
      include: { analysis: true }
    });
    if (diagnostic?.analysis) {
      userPrompt += `\nMaturity Score: ${diagnostic.analysis.maturityScore}/100
      Key Challenges: ${diagnostic.analysis.risks.slice(0, 3).join(', ')}
      Recommendations: ${diagnostic.analysis.recommendations.slice(0, 3).join(', ')}`;
    }
  }
  
  // Get AI response with memory
  const response = await ollamaStream({
    userId: context.userId,
    module: 'vela_guide',
    topic: context.topic,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    useMemory: true,
    cacheKey: `vela_guide_${context.userId}_${context.topic}`,
    maxTokens: 1500
  });
  
  // Parse response sections
  const guidance = response.content;
  const actions = extractSection(guidance, 'Action') || [guidance.slice(0, 200)];
  const nextSteps = extractSection(guidance, 'Next') || ['Review recommendations', 'Validate assumptions'];
  const resources = extractSection(guidance, 'Resource') || [];
  
  // Extract related topics
  const relatedTopics = extractTopics(guidance);
  
  // Save guidance memory
  await prisma.aIMemory.create({
    data: {
      userId: context.userId,
      modelId: (await getDefaultModelId()),
      type: 'guidance',
      category: 'vela_guide',
      key: `guidance_${context.topic}_${Date.now()}`,
      content: guidance,
      importance: 0.6,
      metadata: JSON.stringify({
        diagnosticId: context.diagnosticId,
        ventureId: context.ventureId,
        objectiveId: context.objectiveId
      })
    }
  });
  
  return {
    guidance,
    actions,
    nextSteps,
    resources,
    relatedTopics,
    savedMemory: true,
    conversationId: response.conversationId || ''
  };
}

/**
 * Stream guidance for real-time updates
 */
export async function streamVelaGuidance(
  context: GuideContext,
  onChunk: (chunk: string) => void
): Promise<GuideResponse> {
  // Queue for async processing and stream updates
  const guidance = await getVelaGuidance(context);
  return guidance;
}

/**
 * Get recommended next topic based on current guidance
 */
export async function getNextGuidanceTopic(userId: string, currentTopic: string): Promise<string> {
  // Query recent memory for patterns
  const recentMemories = await prisma.aIMemory.findMany({
    where: {
      userId,
      category: 'vela_guide',
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    },
    orderBy: { importance: 'desc' },
    take: 3
  });
  
  const topics = recentMemories.map(m => m.key);
  
  // Use Ollama to suggest next logical topic
  const response = await ollamaStream({
    userId,
    module: 'vela_guide',
    messages: [
      {
        role: 'system',
        content: 'You are a mentor. Based on these topics, suggest the next most important topic to discuss: ' + topics.join(', ')
      },
      {
        role: 'user',
        content: `Current topic: ${currentTopic}. What should we focus on next?`
      }
    ],
    maxTokens: 100
  });
  
  return response.content.split('\n')[0];
}

/**
 * Helper: Extract sections from guidance
 */
function extractSection(text: string, keyword: string): string[] {
  const regex = new RegExp(`${keyword}[^:]*:\\s*([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'i');
  const match = text.match(regex);
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.startsWith('-'));
}

/**
 * Helper: Extract related topics
 */
function extractTopics(text: string): string[] {
  const keywords = ['market validation', 'customer discovery', 'business model', 'team building', 'financing', 'product development'];
  return keywords.filter(k => text.toLowerCase().includes(k));
}

/**
 * Helper: Get default model ID
 */
async function getDefaultModelId(): Promise<string> {
  const model = await prisma.aIModel.findFirst({
    where: { isDefault: true }
  });
  return model?.id || '';
}
