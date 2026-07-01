import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

/**
 * AI Streaming Endpoint
 * Real-time token-by-token streaming from Ollama LLMs
 */

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
    const { prompt, module = 'default', topic = 'general', useMemory = true, maxTokens = 1024 } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // Create streaming response
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          const model = process.env.OLLAMA_MODEL || 'llama3';
          
          // Call Ollama API for streaming
          const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              stream: true,
              options: {
                temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
                top_p: 0.95,
                num_predict: parseInt(process.env.AI_MAX_TOKENS || '1024')
              }
            })
          });
          
          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }
          
          const decoder = new TextDecoder();
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Process all complete lines
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line) {
                try {
                  const data = JSON.parse(line);
                  if (data.message?.content) {
                    // Send chunk as SSE
                    const chunk = data.message.content;
                    const sseData = `data: ${JSON.stringify({ 
                      chunk, 
                      done: data.done,
                      tokens: data.message?.tokens_evaluated || 0
                    })}\n\n`;
                    controller.enqueue(encoder.encode(sseData));
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                }
              }
            }
            
            // Keep incomplete line in buffer
            buffer = lines[lines.length - 1];
          }
          
          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              if (data.message?.content) {
                const sseData = `data: ${JSON.stringify({ 
                  chunk: data.message.content,
                  done: true,
                  tokens: data.message?.tokens_evaluated || 0
                })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
            } catch (e) {
              // Ignore
            }
          }
          
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
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
    
  } catch (error) {
    console.error('AI streaming error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize stream' },
      { status: 500 }
    );
  }
}
