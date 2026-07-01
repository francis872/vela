/**
 * Real-time WebSocket Handler
 * Bidirectional communication for VELA Guide, Bizzu, Live Diagnostics
 */

import { prisma } from './prisma';

export interface WSMessage {
  type: string;
  userId: string;
  module: string;
  data: any;
  timestamp: number;
}

export interface WSConnection {
  userId: string;
  sessionId: string;
  module: string;
  isAlive: boolean;
  lastHeartbeat: number;
}

type MessageHandler = (conn: WSConnection, msg?: WSMessage) => Promise<any>;

export class WebSocketManager {
  private connections: Map<string, WSConnection> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.registerDefaultHandlers();
    this.startHeartbeat();
  }
  
  /**
   * Register a connection
   */
  async registerConnection(userId: string, sessionId: string, module: string) {
    const connection: WSConnection = {
      userId,
      sessionId,
      module,
      isAlive: true,
      lastHeartbeat: Date.now()
    };
    
    this.connections.set(sessionId, connection);
    
    // Save to database
    await prisma.realtimeConnection.create({
      data: {
        userId,
        sessionId,
        connectionType: 'websocket',
        module,
        isActive: true
      }
    });
    
    return connection;
  }
  
  /**
   * Unregister a connection
   */
  async unregisterConnection(sessionId: string) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;
    
    this.connections.delete(sessionId);
    
    // Update database
    await prisma.realtimeConnection.update({
      where: { sessionId },
      data: {
        isActive: false,
        disconnectedAt: new Date(),
        messagesSent: { increment: 0 } // Final update
      }
    });
  }
  
  /**
   * Process incoming message
   */
  async handleMessage(sessionId: string, message: WSMessage) {
    const connection = this.connections.get(sessionId);
    if (!connection) return null;
    
    // Update connection heartbeat
    connection.lastHeartbeat = Date.now();
    
    // Log message
    await prisma.realtimeConnection.update({
      where: { sessionId },
      data: {
        messagesReceived: { increment: 1 },
        lastHeartbeat: new Date()
      }
    });
    
    // Route to handler
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      return await handler(connection, message);
    }
    
    return { error: 'Unknown message type' };
  }
  
  /**
   * Register message handler
   */
  registerHandler(type: string, handler: MessageHandler) {
    this.messageHandlers.set(type, handler);
  }
  
  /**
   * Broadcast to all connections in a module
   */
  async broadcast(module: string, message: any) {
    const recipients: string[] = [];
    
    for (const [sessionId, conn] of this.connections.entries()) {
      if (conn.module === module && conn.isAlive) {
        recipients.push(sessionId);
      }
    }
    
    return { recipients, message };
  }
  
  /**
   * Send to specific user
   */
  async sendToUser(userId: string, message: any) {
    const recipients: string[] = [];
    
    for (const [sessionId, conn] of this.connections.entries()) {
      if (conn.userId === userId && conn.isAlive) {
        recipients.push(sessionId);
      }
    }
    
    return { recipients, message };
  }
  
  /**
   * Register default handlers
   */
  private registerDefaultHandlers() {
    // Heartbeat
    this.registerHandler('ping', async (conn) => {
      return { type: 'pong', timestamp: Date.now() };
    });
    
    // AI Query
    this.registerHandler('ai_query', async (conn, msg) => {
      const { ollamaStream } = await import('./ollama-engine');
      if (!msg) return { type: 'error', data: 'Message is required' };
      
      try {
        const response = await ollamaStream({
          userId: conn.userId,
          module: conn.module,
          topic: msg.data.topic,
          messages: msg.data.messages || [],
          useMemory: true
        });
        
        await prisma.realtimeConnection.update({
          where: { sessionId: conn.sessionId },
          data: { messagesSent: { increment: 1 } }
        });
        
        return { type: 'ai_response', data: response };
      } catch (error) {
        return { type: 'error', data: (error as Error).message };
      }
    });
    
    // Subscribe to diagnostics
    this.registerHandler('subscribe_diagnostic', async (conn, msg) => {
      if (!msg) return { type: 'error', data: 'Message is required' };
      const { diagnosticId } = msg.data;
      // Real-time updates would be pushed here
      return { type: 'subscribed', diagnosticId };
    });
  }
  
  /**
   * Heartbeat check - remove stale connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const staleConnections: string[] = [];
      
      for (const [sessionId, conn] of this.connections.entries()) {
        if (now - conn.lastHeartbeat > 60000) { // 1 minute
          staleConnections.push(sessionId);
        }
      }
      
      for (const sessionId of staleConnections) {
        await this.unregisterConnection(sessionId);
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Get connection stats
   */
  getStats() {
    let totalConnections = 0;
    const byModule: Record<string, number> = {};
    
    for (const [_, conn] of this.connections.entries()) {
      if (conn.isAlive) {
        totalConnections++;
        byModule[conn.module] = (byModule[conn.module] || 0) + 1;
      }
    }
    
    return { totalConnections, byModule };
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
