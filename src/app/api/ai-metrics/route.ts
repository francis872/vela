import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * AI Statistics & Queue Management
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
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // Get AI statistics
      const today = new Date().toISOString().split('T')[0];
      const stats = await prisma.aIStatistics.findMany({
        where: {
          date: { gte: new Date(today) }
        }
      });
      
      return NextResponse.json({
        stats,
        summary: {
          totalRequests: stats.reduce((a, s) => a + s.totalRequests, 0),
          successRate: stats.length > 0
            ? stats.reduce((a, s) => a + s.successfulRequests, 0) / 
              stats.reduce((a, s) => a + s.totalRequests, 0) * 100
            : 0,
          avgResponseTime: stats.length > 0
            ? stats.reduce((a, s) => a + s.avgResponseTimeMs, 0) / stats.length
            : 0,
          totalTokens: stats.reduce((a, s) => a + s.totalTokensUsed, 0)
        }
      });
      
    } else if (action === 'queue') {
      // Get user's AI processing queue
      const queue = await prisma.aIProcessingQueue.findMany({
        where: { userId: session.sub },
        orderBy: { priority: 'desc' }
      });
      
      return NextResponse.json({
        pending: queue.filter(q => q.status === 'pending').length,
        processing: queue.filter(q => q.status === 'processing').length,
        completed: queue.filter(q => q.status === 'completed').length,
        failed: queue.filter(q => q.status === 'failed').length,
        queue
      });
      
    } else if (action === 'memory') {
      // Get user's AI memory stats
      const memories = await prisma.aIMemory.findMany({
        where: { userId: session.sub },
        select: {
          type: true,
          category: true,
          importance: true,
          accessCount: true
        }
      });
      
      const summary = {
        total: memories.length,
        byType: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        avgImportance: memories.length > 0 
          ? memories.reduce((a, m) => a + m.importance, 0) / memories.length 
          : 0,
        totalAccess: memories.reduce((a, m) => a + m.accessCount, 0)
      };
      
      for (const mem of memories) {
        summary.byType[mem.type] = (summary.byType[mem.type] || 0) + 1;
        summary.byCategory[mem.category] = (summary.byCategory[mem.category] || 0) + 1;
      }
      
      return NextResponse.json(summary);
      
    } else if (action === 'realtime') {
      // Get realtime connection stats
      const connections = await prisma.realtimeConnection.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json({
        active: connections.filter(c => c.isActive).length,
        total: connections.length,
        connections
      });
      
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('AI metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
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
    const { action, data } = body;
    
    if (action === 'clear_memory') {
      // Clear old memory for the user
      const daysOld = data.daysOld || 30;
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await prisma.aIMemory.deleteMany({
        where: {
          userId: session.sub,
          createdAt: { lt: cutoffDate },
          importance: { lt: 0.2 }
        }
      });
      
      return NextResponse.json({
        message: 'Memory cleared',
        deletedCount: result.count
      });
      
    } else if (action === 'optimize_cache') {
      // Clear expired cache entries
      const result = await prisma.dataCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      
      return NextResponse.json({
        message: 'Cache optimized',
        deletedCount: result.count
      });
      
    } else if (action === 'process_queue') {
      // Manually trigger queue processing
      const { processAIQueue } = await import('@/lib/ollama-engine');
      await processAIQueue();
      
      return NextResponse.json({
        message: 'Queue processing initiated'
      });
      
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('AI management error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
