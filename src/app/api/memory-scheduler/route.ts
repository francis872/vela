import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { memoryScheduler, ensureSchedulerRunning } from '@/lib/memory-scheduler';

/**
 * Memory Scheduler Management API
 * Status, health reports, and manual maintenance triggers
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
    
    // Ensure scheduler is running
    ensureSchedulerRunning();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'status') {
      // Get scheduler status
      const stats = memoryScheduler.getStats();
      return NextResponse.json({
        status: 'ok',
        scheduler: stats,
        timestamp: new Date()
      });
      
    } else if (action === 'health') {
      // Get health report of memory system
      const health = await memoryScheduler.getHealthReport();
      return NextResponse.json({
        status: 'ok',
        health
      });
      
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Memory scheduler API error:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduler info' },
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
    const { action } = body;
    
    if (action === 'start') {
      // Start the scheduler
      memoryScheduler.start(3600000); // 1 hour
      return NextResponse.json({
        status: 'started',
        message: 'Memory scheduler started',
        timestamp: new Date()
      });
      
    } else if (action === 'stop') {
      // Stop the scheduler
      memoryScheduler.stop();
      return NextResponse.json({
        status: 'stopped',
        message: 'Memory scheduler stopped',
        timestamp: new Date()
      });
      
    } else if (action === 'trigger') {
      // Manually trigger maintenance
      const result = await memoryScheduler.trigger();
      return NextResponse.json({
        status: 'maintenance_completed',
        result,
        timestamp: new Date()
      });
      
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Memory scheduler management error:', error);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}
