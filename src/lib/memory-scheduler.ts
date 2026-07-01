import { prisma } from './prisma';

/**
 * Memory Scheduler
 * Automated memory cleanup, optimization, and importance decay
 */

interface MemoryMaintenanceStats {
  expired: number;
  lowImportance: number;
  updated: number;
  decayed: number;
  timestamp: Date;
}

class MemoryScheduler {
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private stats: MemoryMaintenanceStats[] = [];

  /**
   * Start the memory scheduler
   */
  start(intervalMs: number = 3600000) {
    // Default: 1 hour
    if (this.isRunning) {
      console.warn('Memory scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Memory scheduler started (interval: ${intervalMs}ms)`);

    // Run immediately on startup
    this.runMaintenance();

    // Then run on interval
    this.maintenanceInterval = setInterval(() => {
      this.runMaintenance();
    }, intervalMs);
  }

  /**
   * Stop the memory scheduler
   */
  stop() {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    this.isRunning = false;
    console.log('Memory scheduler stopped');
  }

  /**
   * Run memory maintenance tasks
   */
  private async runMaintenance(): Promise<MemoryMaintenanceStats> {
    try {
      const startTime = Date.now();
      const stats: MemoryMaintenanceStats = {
        expired: 0,
        lowImportance: 0,
        updated: 0,
        decayed: 0,
        timestamp: new Date()
      };

      // 1. Delete expired memories
      const expiredResult = await prisma.aIMemory.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      stats.expired = expiredResult.count;

      // 2. Delete low-importance old memories
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const lowImportanceResult = await prisma.aIMemory.deleteMany({
        where: {
          AND: [
            { importance: { lt: 0.2 } },
            { lastAccessedAt: { lt: thirtyDaysAgo } },
            { accessCount: { lt: 3 } }
          ]
        }
      });
      stats.lowImportance = lowImportanceResult.count;

      // 3. Apply importance decay for unused memories
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const unusedMemories = await prisma.aIMemory.findMany({
        where: {
          AND: [
            { importance: { gte: 0.2 } },
            { lastAccessedAt: { lt: sevenDaysAgo } },
            { accessCount: { lt: 1 } }
          ]
        },
        select: { id: true, importance: true }
      });

      for (const memory of unusedMemories) {
        // Decay formula: reduce importance by 10% each week unused
        const decayedImportance = Math.max(0.1, memory.importance * 0.9);
        await prisma.aIMemory.update({
          where: { id: memory.id },
          data: { importance: decayedImportance }
        });
        stats.decayed++;
      }

      // 4. Archive very old accessed memories (older than 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const archivedResult = await prisma.aIMemory.updateMany({
        where: {
          AND: [
            { lastAccessedAt: { lt: ninetyDaysAgo } },
            { importance: { gte: 0.2 } }
          ]
        },
        data: { importance: { set: 0.15 } } // Mark as archived
      });
      stats.updated = archivedResult.count;

      // 5. Clean up expired cache entries
      const cacheCleanup = await prisma.dataCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      // 6. Optimize cache: keep only top 80% by hit count per module
      const modules = await prisma.dataCache.groupBy({
        by: ['module'],
        _count: true
      });

      for (const moduleGroup of modules) {
        const allCacheEntries = await prisma.dataCache.findMany({
          where: { module: moduleGroup.module },
          orderBy: { hitCount: 'desc' },
          select: { id: true }
        });

        const topPercentile = Math.ceil(allCacheEntries.length * 0.8);
        const toDelete = allCacheEntries.slice(topPercentile);

        if (toDelete.length > 0) {
          await prisma.dataCache.deleteMany({
            where: {
              id: { in: toDelete.map(e => e.id) }
            }
          });
        }
      }

      const duration = Date.now() - startTime;
      this.lastRun = new Date();
      this.stats.push(stats);

      // Keep only last 100 runs
      if (this.stats.length > 100) {
        this.stats = this.stats.slice(-100);
      }

      console.log(`Memory maintenance completed in ${duration}ms:`, {
        expired: stats.expired,
        lowImportance: stats.lowImportance,
        decayed: stats.decayed,
        archived: stats.updated,
        cacheDeleted: cacheCleanup.count
      });

      return stats;
    } catch (error) {
      console.error('Memory maintenance error:', error);
      throw error;
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      recentStats: this.stats.slice(-10)
    };
  }

  /**
   * Manually trigger maintenance
   */
  async trigger() {
    if (!this.isRunning) {
      console.warn('Scheduler is not running. Starting maintenance manually...');
    }
    return this.runMaintenance();
  }

  /**
   * Get memory health report
   */
  async getHealthReport() {
    try {
      const totalMemories = await prisma.aIMemory.count();
      const totalCache = await prisma.dataCache.count();
      
      const memoryByImportance = await prisma.aIMemory.groupBy({
        by: ['importance'],
        where: {
          importance: { not: undefined }
        }
      });

      const memoriesByType = await prisma.aIMemory.groupBy({
        by: ['type'],
        _count: true
      });

      const topAccessedMemories = await prisma.aIMemory.findMany({
        orderBy: { accessCount: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          category: true,
          importance: true,
          accessCount: true,
          lastAccessedAt: true
        }
      });

      return {
        timestamp: new Date(),
        summary: {
          totalMemories,
          totalCache,
          avgImportance: totalMemories > 0
            ? (await prisma.aIMemory.aggregate({
              _avg: { importance: true }
            }))._avg.importance || 0
            : 0
        },
        memoriesByType,
        topAccessed: topAccessedMemories,
        schedulerStats: this.getStats()
      };
    } catch (error) {
      console.error('Health report error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const memoryScheduler = new MemoryScheduler();

// Auto-start scheduler on first request (not during build)
export function ensureSchedulerRunning() {
  if (!memoryScheduler['isRunning']) {
    try {
      memoryScheduler.start(3600000); // 1 hour
    } catch (error) {
      console.warn('Failed to start memory scheduler:', error);
    }
  }
}
