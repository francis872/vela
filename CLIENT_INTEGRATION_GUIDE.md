# 🎯 Client Integration Examples

Complete examples for integrating the new WebSocket, Streaming, and Memory APIs into your VELA platform frontend.

---

## 1️⃣ Real-time Vela Guide with Streaming

### React Component Example

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';

export function VelaGuideStream() {
  const [topic, setTopic] = useState('startup_basics');
  const [guidance, setGuidance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamGuidance = async () => {
    try {
      setLoading(true);
      setGuidance('');
      setError('');

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/vela-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          stream: true,
          diagnosticId: 'current-diagnostic',
          ventureId: 'current-venture'
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Read Server-Sent Events stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.complete) {
                setLoading(false);
              } else if (data.error) {
                setError(data.error);
              } else if (data.chunk) {
                setGuidance((prev) => prev + data.chunk);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        buffer = lines[lines.length - 1];
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>VELA Personalized Guidance</h2>

      <div style={{ marginBottom: '15px' }}>
        <label>
          Topic:
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          >
            <option value="startup_basics">Startup Basics</option>
            <option value="market_research">Market Research</option>
            <option value="fundraising">Fundraising</option>
            <option value="team_building">Team Building</option>
          </select>
        </label>
      </div>

      <button
        onClick={streamGuidance}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'default' : 'pointer'
        }}
      >
        {loading ? 'Streaming...' : 'Get Guidance'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '15px' }}>
          Error: {error}
        </div>
      )}

      {guidance && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
        >
          {guidance}
        </div>
      )}
    </div>
  );
}
```

---

## 2️⃣ BiZZu Decision Analysis with Streaming

### React Hook Example

```typescript
'use client';

import { useCallback, useRef, useState } from 'react';

interface AnalysisResult {
  rationale: string;
  risks: string[];
  alternatives: string[];
  recommendation: string;
  confidence: number;
}

export function useBizZuAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyzeDecision = useCallback(
    async (
      decisionTitle: string,
      context: string,
      options: string[],
      stream: boolean = true
    ) => {
      try {
        setLoading(true);
        setAnalysis(null);
        setError('');

        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/bizzu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze_decision',
            stream,
            data: { decisionTitle, context, options }
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (stream) {
          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let fullText = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i];
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.chunk) {
                    fullText += data.chunk;
                  } else if (data.complete) {
                    // Parse final result
                    const result = parseAnalysisText(fullText);
                    setAnalysis(result);
                    setLoading(false);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }

            buffer = lines[lines.length - 1];
          }
        } else {
          // Handle standard JSON response
          const data = await response.json();
          setAnalysis(data);
          setLoading(false);
        }
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

  return { analysis, loading, error, analyzeDecision, cancel };
}

// Helper function to parse analysis text
function parseAnalysisText(text: string): AnalysisResult {
  // Simple parsing - in production, use proper text parsing
  return {
    rationale: text.split('Rationale:')[1]?.split('Risks:')[0] || '',
    risks: text
      .split('Risks:')[1]
      ?.split('Alternatives:')[0]
      ?.split('\n')
      .filter((l) => l.trim()) || [],
    alternatives: text
      .split('Alternatives:')[1]
      ?.split('Recommendation:')[0]
      ?.split('\n')
      .filter((l) => l.trim()) || [],
    recommendation: text.split('Recommendation:')[1]?.split('Confidence:')[0] || '',
    confidence: parseInt(
      text.split('Confidence:')[1]?.match(/\d+/)?.[0] || '0'
    )
  };
}
```

---

## 3️⃣ WebSocket Connection Manager

### Custom Hook Example

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface WSMessage {
  type: string;
  data: any;
}

export function useWebSocket(module: string) {
  const [connected, setConnected] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const messageHandlers = useRef<Map<string, Function>>(new Map());

  // Alternative to native WebSocket: SSE/polling since we're serverless
  useEffect(() => {
    // Register connection
    const registerConnection = async () => {
      try {
        const response = await fetch('/api/websocket', {
          method: 'POST',
          body: JSON.stringify({
            action: 'connect',
            sessionId,
            module
          })
        });

        if (response.ok) {
          setConnected(true);
        }
      } catch (error) {
        console.error('Failed to register WebSocket:', error);
      }
    };

    registerConnection();

    return () => {
      // Cleanup: unregister connection
      fetch('/api/websocket', {
        method: 'POST',
        body: JSON.stringify({
          action: 'disconnect',
          sessionId
        })
      }).catch(console.error);
    };
  }, [sessionId, module]);

  // Send message
  const send = useCallback(
    async (type: string, payload: any) => {
      try {
        const response = await fetch('/api/websocket', {
          method: 'POST',
          body: JSON.stringify({
            action: 'send_message',
            sessionId,
            data: { type, module, payload }
          })
        });

        return await response.json();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [sessionId, module]
  );

  // Register handler for specific message type
  const on = useCallback((type: string, handler: Function) => {
    messageHandlers.current.set(type, handler);
  }, []);

  // Broadcast to all in module
  const broadcast = useCallback(
    async (type: string, payload: any) => {
      try {
        const response = await fetch('/api/websocket', {
          method: 'POST',
          body: JSON.stringify({
            action: 'broadcast',
            module,
            data: { type, payload }
          })
        });

        return await response.json();
      } catch (error) {
        console.error('Failed to broadcast:', error);
      }
    },
    [module]
  );

  return { connected, send, on, broadcast, messages };
}

// Usage example in component
export function DiagnosticListener() {
  const { connected, send, on } = useWebSocket('diagnostics');

  useEffect(() => {
    if (!connected) return;

    // Subscribe to diagnostic updates
    on('diagnostic_updated', (data) => {
      console.log('Diagnostic updated:', data);
      // Update UI
    });

    // Send AI query
    send('ai_query', {
      topic: 'analysis',
      messages: [
        { role: 'user', content: 'Analyze this diagnostic' }
      ]
    });
  }, [connected, send, on]);

  return (
    <div>
      Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

---

## 4️⃣ Direct AI Streaming Endpoint

### Fetch Wrapper Example

```typescript
'use client';

export async function* streamAIResponse(
  prompt: string,
  options: {
    module?: string;
    topic?: string;
    useMemory?: boolean;
    maxTokens?: number;
  } = {}
) {
  const response = await fetch('/api/ai-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      module: options.module || 'default',
      topic: options.topic || 'general',
      useMemory: options.useMemory !== false,
      maxTokens: options.maxTokens || 1024
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            yield {
              chunk: data.chunk,
              done: data.done || false,
              tokens: data.tokens || 0
            };
          }
        }
      }

      buffer = lines[lines.length - 1];
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage in component
export function AIResponseDisplay() {
  const [output, setOutput] = useState('');

  const startStreaming = async () => {
    try {
      for await (const { chunk } of streamAIResponse(
        'Tell me about startup funding',
        { module: 'vela_guide', topic: 'fundraising' }
      )) {
        setOutput((prev) => prev + chunk);
      }
    } catch (error) {
      console.error('Streaming error:', error);
    }
  };

  return (
    <div>
      <button onClick={startStreaming}>Start Streaming</button>
      <pre>{output}</pre>
    </div>
  );
}
```

---

## 5️⃣ Memory Health Monitoring

### Dashboard Component Example

```typescript
'use client';

import { useEffect, useState } from 'react';

interface MemoryHealth {
  totalMemories: number;
  avgImportance: number;
  memoriesByType: Record<string, number>;
  topAccessed: Array<{
    id: string;
    type: string;
    category: string;
    importance: number;
    accessCount: number;
  }>;
  schedulerStats: any;
}

export function MemoryHealthDashboard() {
  const [health, setHealth] = useState<MemoryHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory-scheduler?action=health');
      const data = await response.json();
      setHealth(data.health);
    } catch (error) {
      console.error('Failed to fetch health:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerMaintenance = async () => {
    try {
      await fetch('/api/memory-scheduler', {
        method: 'POST',
        body: JSON.stringify({ action: 'trigger' })
      });
      // Refresh health
      fetchHealth();
    } catch (error) {
      console.error('Failed to trigger maintenance:', error);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (!health) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Memory Health Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Total Memories</strong>
          <div style={{ fontSize: '24px' }}>{health.totalMemories}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Avg Importance</strong>
          <div style={{ fontSize: '24px' }}>
            {(health.avgImportance * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Scheduler Status</strong>
          <div style={{ fontSize: '14px' }}>
            {health.schedulerStats.isRunning ? '🟢 Running' : '🔴 Stopped'}
          </div>
        </div>
      </div>

      <h3>Memories by Type</h3>
      <ul>
        {Object.entries(health.memoriesByType).map(([type, count]) => (
          <li key={type}>
            {type}: {count}
          </li>
        ))}
      </ul>

      <h3>Top Accessed</h3>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '10px'
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '10px' }}>Type</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
            <th style={{ textAlign: 'center', padding: '10px' }}>Importance</th>
            <th style={{ textAlign: 'center', padding: '10px' }}>Access Count</th>
          </tr>
        </thead>
        <tbody>
          {health.topAccessed.map((mem) => (
            <tr key={mem.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{mem.type}</td>
              <td style={{ padding: '10px' }}>{mem.category}</td>
              <td style={{ textAlign: 'center', padding: '10px' }}>
                {(mem.importance * 100).toFixed(0)}%
              </td>
              <td style={{ textAlign: 'center', padding: '10px' }}>
                {mem.accessCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={triggerMaintenance}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Running Maintenance...' : 'Run Maintenance Now'}
      </button>
    </div>
  );
}
```

---

## 📋 API Reference Quick Sheet

| Endpoint | Method | Streaming | Auth | Purpose |
|----------|--------|-----------|------|---------|
| `/api/vela-guide` | POST | ✅ SSE | JWT | Personalized guidance |
| `/api/bizzu` | POST | ✅ SSE | JWT | Decision analysis |
| `/api/ai-stream` | POST | ✅ SSE | JWT | Direct LLM streaming |
| `/api/websocket` | GET/POST | ❌ REST | JWT | WebSocket management |
| `/api/memory-scheduler` | GET/POST | ❌ REST | JWT | Memory health & control |
| `/api/ai-metrics` | GET/POST | ❌ REST | JWT | AI statistics |

---

## 🔑 Environment Variables Required

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1024
DATABASE_URL=postgresql://user:pass@localhost:5433/vela
```

---

**Last Updated:** 2026-07-01  
**Created by:** GitHub Copilot
