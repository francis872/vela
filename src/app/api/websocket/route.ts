import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { wsManager } from '@/lib/websocket-manager';

/**
 * WebSocket Route Handler
 * Manages real-time bidirectional communication for VELA Guide, BiZZu, Live Diagnostics
 */

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
    
    // Return WebSocket connection info (for testing/status)
    const stats = wsManager.getStats();
    return NextResponse.json({
      status: 'ready',
      message: 'WebSocket server is running',
      stats,
      endpoint: '/api/websocket',
      userId: session.sub
    });
    
  } catch (error) {
    console.error('WebSocket GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get WebSocket status' },
      { status: 500 }
    );
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
    const { action, sessionId, module, data } = body;
    
    if (action === 'connect') {
      // Register new WebSocket connection
      if (!sessionId || !module) {
        return NextResponse.json(
          { error: 'sessionId and module are required' },
          { status: 400 }
        );
      }
      
      wsManager.registerConnection(session.sub, sessionId, module);
      
      return NextResponse.json({
        status: 'connected',
        userId: session.sub,
        sessionId,
        module,
        message: 'WebSocket connection registered'
      });
      
    } else if (action === 'disconnect') {
      // Unregister WebSocket connection
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        );
      }
      
      wsManager.unregisterConnection(sessionId);
      
      return NextResponse.json({
        status: 'disconnected',
        sessionId,
        message: 'WebSocket connection unregistered'
      });
      
    } else if (action === 'send_message') {
      // Send message through WebSocket
      if (!sessionId || !data) {
        return NextResponse.json(
          { error: 'sessionId and data are required' },
          { status: 400 }
        );
      }
      
      // Handle message routing
      wsManager.handleMessage(sessionId, {
        type: data.type,
        userId: session.sub,
        module: data.module || 'default',
        data: data.payload,
        timestamp: Date.now()
      });
      
      return NextResponse.json({
        status: 'sent',
        message: 'Message routed through WebSocket handlers'
      });
      
    } else if (action === 'broadcast') {
      // Broadcast to all users in a module
      if (!module || !data) {
        return NextResponse.json(
          { error: 'module and data are required' },
          { status: 400 }
        );
      }
      
      const recipients = wsManager.broadcast(module, {
        type: data.type,
        userId: session.sub,
        module,
        data: data.payload,
        timestamp: Date.now()
      });
      
      return NextResponse.json({
        status: 'broadcast',
        module,
        recipients,
        message: `Message broadcast to ${recipients} recipients`
      });
      
    } else if (action === 'stats') {
      // Get WebSocket statistics
      const stats = wsManager.getStats();
      
      return NextResponse.json({
        status: 'stats',
        ...stats
      });
      
    } else {
      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('WebSocket POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process WebSocket request' },
      { status: 500 }
    );
  }
}

/**
 * WebSocket upgrade handler
 * In a production Next.js setup, true WebSocket support would require:
 * - Using a WebSocket server library (ws, Socket.io)
 * - Running on Node.js (not serverless)
 * - This REST endpoint provides polling/SSE fallback
 */
