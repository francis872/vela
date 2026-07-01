import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { analyzeDecision, generateExecutionPlan, validateSprintProgress, calculateExecutionScore } from '@/lib/bizzu-service';
import { ollamaStream } from '@/lib/ollama-engine';

async function* streamAnalysisChunks(prompt: string, userId: string) {
  try {
    const response = await ollamaStream({
      userId,
      module: 'bizzu',
      topic: 'analysis',
      messages: [{ role: 'user', content: prompt }],
      useMemory: true
    });
    
    // Yield chunks (simulating token-by-token streaming)
    const content = response.content;
    const chunkSize = 50;
    for (let i = 0; i < content.length; i += chunkSize) {
      yield content.slice(i, i + chunkSize);
      // Simulate delay for streaming effect
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await verifySession(token).catch(() => null);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, data, stream } = body;
    
    if (action === 'analyze_decision') {
      const { decisionTitle, context, options } = data;
      
      if (stream) {
        // Streaming response
        const prompt = `Analyze this decision: ${decisionTitle}\nContext: ${context}\nOptions: ${options.join(', ')}`;
        
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const encoder = new TextEncoder();
              for await (const chunk of streamAnalysisChunks(prompt, session.sub)) {
                const data = `data: ${JSON.stringify({ chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
              const completion = `data: ${JSON.stringify({ complete: true })}\n\n`;
              controller.enqueue(encoder.encode(completion));
              controller.close();
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              const errorData = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
              controller.enqueue(new TextEncoder().encode(errorData));
              controller.close();
            }
          }
        });
        
        return new NextResponse(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      } else {
        // Standard response
        const analysis = await analyzeDecision(
          session.sub,
          decisionTitle,
          context,
          options
        );
        return NextResponse.json(analysis);
      }
      
    } else if (action === 'generate_plan') {
      const { objectiveTitle, description, deadline } = data;
      
      if (stream) {
        // Streaming response
        const prompt = `Generate execution plan for: ${objectiveTitle}\nDescription: ${description}\nDeadline: ${deadline}`;
        
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const encoder = new TextEncoder();
              for await (const chunk of streamAnalysisChunks(prompt, session.sub)) {
                const data = `data: ${JSON.stringify({ chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
              const completion = `data: ${JSON.stringify({ complete: true })}\n\n`;
              controller.enqueue(encoder.encode(completion));
              controller.close();
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              const errorData = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
              controller.enqueue(new TextEncoder().encode(errorData));
              controller.close();
            }
          }
        });
        
        return new NextResponse(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      } else {
        // Standard response
        const plan = await generateExecutionPlan(
          session.sub,
          objectiveTitle,
          description,
          deadline
        );
        return NextResponse.json(plan);
      }
      
    } else if (action === 'validate_sprint') {
      const { sprintId, completedItems, blockedItems, learnings } = data;
      const validation = await validateSprintProgress(
        session.sub,
        sprintId,
        completedItems,
        blockedItems,
        learnings
      );
      return NextResponse.json(validation);
      
    } else if (action === 'score') {
      const score = await calculateExecutionScore(session.sub);
      return NextResponse.json({ 
        executionScore: score,
        timestamp: new Date(),
        userId: session.sub
      });
      
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('BiZZu error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
