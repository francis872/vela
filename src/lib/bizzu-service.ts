/**
 * BiZZu Service
 * AI-powered execution engine for objectives, decisions, and sprints
 * Tracks decisions, validates execution, measures progress
 */

import { prisma } from './prisma';
import { ollamaStream } from './ollama-engine';

export interface ExecutionContext {
  userId: string;
  objectiveId?: string;
  sprintId?: string;
  decisionContext?: string;
}

export interface DecisionAnalysis {
  decision: string;
  rationale: string;
  risks: string[];
  alternatives: string[];
  recommendedAction: string;
  confidenceScore: number;
}

export interface ExecutionPlan {
  title: string;
  weeklyActions: string[];
  keyMetrics: string[];
  risks: string[];
  resources: string[];
  dependencies: string[];
  estimatedHours: number;
}

/**
 * Analyze a decision with AI support
 */
export async function analyzeDecision(
  userId: string,
  decisionTitle: string,
  context: string,
  options: string[]
): Promise<DecisionAnalysis> {
  const prompt = `You are an expert business advisor. Analyze this decision:
  
  Decision: ${decisionTitle}
  Context: ${context}
  Options: ${options.join(', ')}
  
  Provide:
  1. Clear recommendation
  2. Rationale (2-3 sentences)
  3. Top 3 risks
  4. 2 alternatives
  5. Confidence score (0-100)`;
  
  const response = await ollamaStream({
    userId,
    module: 'bizzu',
    topic: 'decision_analysis',
    messages: [
      {
        role: 'system',
        content: 'You are an expert business advisor helping entrepreneurs make critical decisions.'
      },
      { role: 'user', content: prompt }
    ],
    useMemory: true,
    cacheKey: `decision_${decisionTitle}_${userId}`,
    maxTokens: 800
  });
  
  // Parse response
  const [recommendationPart, ...rest] = response.content.split('Rationale:');
  const [rationalePart] = rest[0]?.split('Risks:') || [];
  
  // Save decision to history
  await prisma.decision.create({
    data: {
      title: decisionTitle,
      context,
      choice: options[0],
      rationale: rationalePart?.trim() || response.content,
      ownerId: userId,
      ownerName: ''
    }
  });
  
  // Save to memory
  await prisma.aIMemory.create({
    data: {
      userId,
      modelId: (await getDefaultModelId()),
      type: 'decision',
      category: 'bizzu',
      key: `decision_${decisionTitle}_${Date.now()}`,
      content: response.content,
      importance: 0.7,
      metadata: JSON.stringify({ options })
    }
  });
  
  return {
    decision: options[0],
    rationale: rationalePart?.trim() || 'Based on analysis provided.',
    risks: extractList(response.content, 'Risk'),
    alternatives: extractList(response.content, 'Alternative'),
    recommendedAction: recommendationPart.trim(),
    confidenceScore: extractScore(response.content)
  };
}

/**
 * Generate execution plan for objective
 */
export async function generateExecutionPlan(
  userId: string,
  objectiveTitle: string,
  objectiveDescription: string,
  deadline: string
): Promise<ExecutionPlan> {
  const prompt = `You are an execution expert. Create a detailed weekly execution plan:
  
  Objective: ${objectiveTitle}
  Description: ${objectiveDescription}
  Deadline: ${deadline}
  
  Provide:
  1. Week-by-week action items (3-4 per week)
  2. Key metrics to track
  3. Potential risks and mitigation
  4. Required resources
  5. Dependencies
  6. Estimated hours
  
  Format for clarity.`;
  
  const response = await ollamaStream({
    userId,
    module: 'bizzu',
    topic: 'execution_planning',
    messages: [
      {
        role: 'system',
        content: 'You are an execution expert helping entrepreneurs build sustainable businesses.'
      },
      { role: 'user', content: prompt }
    ],
    useMemory: true,
    cacheKey: `plan_${objectiveTitle}_${userId}`,
    maxTokens: 1200
  });
  
  return {
    title: objectiveTitle,
    weeklyActions: extractWeeklyActions(response.content),
    keyMetrics: extractList(response.content, 'Metric'),
    risks: extractList(response.content, 'Risk'),
    resources: extractList(response.content, 'Resource'),
    dependencies: extractList(response.content, 'Dependency'),
    estimatedHours: extractHours(response.content)
  };
}

/**
 * Validate sprint progress with AI
 */
export async function validateSprintProgress(
  userId: string,
  sprintId: string,
  completedItems: string[],
  blockedItems: string[],
  learnings: string
): Promise<{ validation: string; suggestions: string[]; nextFocus: string }> {
  const prompt = `Review this sprint progress and provide feedback:
  
  Completed: ${completedItems.join(', ')}
  Blocked: ${blockedItems.join(', ')}
  Learnings: ${learnings}
  
  Provide:
  1. Assessment of progress (positive/areas to improve)
  2. Suggestions for next sprint
  3. Top priority for next week`;
  
  const response = await ollamaStream({
    userId,
    module: 'bizzu',
    topic: 'sprint_validation',
    messages: [
      {
        role: 'system',
        content: 'You are an agile coach helping teams improve execution and velocity.'
      },
      { role: 'user', content: prompt }
    ],
    useMemory: true,
    maxTokens: 600
  });
  
  return {
    validation: response.content,
    suggestions: extractList(response.content, 'Suggestion'),
    nextFocus: extractNextFocus(response.content)
  };
}

/**
 * Calculate execution score
 */
export async function calculateExecutionScore(userId: string): Promise<number> {
  // Get recent decisions and outcomes
  const decisions = await prisma.decision.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  const sprints = await prisma.sprint.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const objectives = await prisma.objective.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  // Calculate based on completion rates and decision quality
  const completedObjectives = objectives.filter(o => o.status === 'completed').length;
  const completionRate = objectives.length > 0 ? (completedObjectives / objectives.length) * 100 : 0;
  
  const blockedObjectives = objectives.filter(o => o.status === 'blocked').length;
  const adaptability = objectives.length > 0 ? 100 - (blockedObjectives / objectives.length) * 50 : 100;
  
  // Update founder score
  const score = Math.round((completionRate * 0.5 + adaptability * 0.5));
  
  await prisma.founderScore.upsert({
    where: { ownerId: userId },
    create: {
      ownerId: userId,
      ownerName: '',
      execution: score
    },
    update: {
      execution: score
    }
  });
  
  return score;
}

/**
 * Helper: Extract weekly actions from response
 */
function extractWeeklyActions(text: string): string[] {
  const lines = text.split('\n');
  const actions: string[] = [];
  
  for (const line of lines) {
    if (line.includes('Week') || line.includes('Day') || line.match(/^\d\./)) {
      actions.push(line.trim());
    }
  }
  
  return actions.slice(0, 12); // 3-4 weeks
}

/**
 * Helper: Extract list items
 */
function extractList(text: string, keyword: string): string[] {
  const regex = new RegExp(`${keyword}[^:]*:\\s*([\\s\\S]*?)(?=\\n[A-Z]|\\n\\d|$)`, 'i');
  const match = text.match(regex);
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .map(l => l.replace(/^[-*•]\s*/, '').trim())
    .filter(l => l.length > 0 && l.length < 200);
}

/**
 * Helper: Extract estimated hours
 */
function extractHours(text: string): number {
  const match = text.match(/(\d+)\s*hours?/i);
  return match ? parseInt(match[1]) : 40;
}

/**
 * Helper: Extract next focus
 */
function extractNextFocus(text: string): string {
  const lines = text.split('\n').filter(l => l.length > 20);
  return lines[lines.length - 1] || 'Focus on highest priority items';
}

/**
 * Helper: Extract confidence score
 */
function extractScore(text: string): number {
  const match = text.match(/(\d+)%?(?:\s*confidence)?/i);
  return match ? Math.min(100, parseInt(match[1])) : 75;
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
