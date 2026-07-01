import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { getVelaGuidance, streamVelaGuidance, getNextGuidanceTopic } from '@/lib/vela-guide-service';

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
    const { topic, diagnosticId, ventureId, objectiveId, stream } = body;
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }
    
    if (stream) {
      // Streaming response using Server-Sent Events
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const encoder = new TextEncoder();
            
            await streamVelaGuidance(
              {
                userId: session.sub,
                diagnosticId,
                ventureId,
                objectiveId,
                topic
              },
              (chunk) => {
                // Send chunk as SSE
                const data = `data: ${JSON.stringify({ chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            );
            
            // Send completion signal
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
      // Standard JSON response (non-streaming)
      const guidance = await getVelaGuidance({
        userId: session.sub,
        topic,
        diagnosticId,
        ventureId,
        objectiveId
      });
      
      return NextResponse.json(guidance);
    }
    
  } catch (error) {
    console.error('VELA Guide error:', error);
    return NextResponse.json(
      { error: 'Failed to generate guidance' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const currentTopic = searchParams.get('currentTopic') || 'startup_basics';
    
    // Get recommended next topic
    const nextTopic = await getNextGuidanceTopic(session.sub, currentTopic);
    
    return NextResponse.json({ 
      nextTopic, 
      currentTopic,
      message: 'Topic recommendation retrieved'
    });
    
  } catch (error) {
    console.error('Error getting next topic:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
