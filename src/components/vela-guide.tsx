"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hola, soy **Vela Guide** — tu asistente dentro del OS.\n\nPuedo explicarte qué es VELA, cómo funcionan sus módulos, cuál es su misión y cómo sacarle el máximo provecho. ¿En qué te ayudo?",
};

export default function VelaGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/guide/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].filter((m) => m.role !== "assistant" || m !== WELCOME) }),
      });
      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error. Inténtalo de nuevo." }]);
        return;
      }
      // Add empty placeholder — loading dots disappear, streaming text appears
      setLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexión. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function renderContent(text: string) {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  }

  // Don't render on /bizzu — it overlaps with the chat send button
  if (pathname === "/bizzu") return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Vela Guide — Asistente IA"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: open ? "var(--accent-2)" : "var(--accent)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(232,92,46,0.4)",
          zIndex: 1000,
          transition: "background 0.15s, transform 0.15s",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4L14 14M14 4L4 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="1.5"/>
            <path d="M10 6v4.5M10 13v.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: "5rem",
          right: "1.5rem",
          width: "min(380px, calc(100vw - 3rem))",
          maxHeight: "70vh",
          background: "var(--surface)",
          border: "1px solid var(--border-mid)",
          borderRadius: 16,
          boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--accent-glow)",
              border: "1px solid var(--accent-glow-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1rem" }}>◈</span>
            </div>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Vela Guide</div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>Asistente de VELA OS</div>
            </div>
            <button
              onClick={() => setMessages([WELCOME])}
              style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}
            >
              Nueva conversación
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{
                  maxWidth: "85%",
                  padding: "0.6rem 0.9rem",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.role === "user" ? "var(--accent)" : "var(--surface-2)",
                  fontSize: "0.82rem",
                  color: m.role === "user" ? "#fff" : "var(--ink-2)",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "0.6rem 0.9rem", borderRadius: "12px 12px 12px 2px",
                  background: "var(--surface-2)", display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--ink-3)",
                      animation: `pulse 1.2s ${d * 0.2}s infinite`,
                      display: "inline-block",
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pregunta sobre VELA..."
              rows={1}
              className="os-input"
              style={{ flex: 1, resize: "none", minHeight: 36, maxHeight: 100, fontSize: "0.82rem", padding: "0.45rem 0.75rem" }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="btn-primary"
              style={{ padding: "0.45rem 0.85rem", flexShrink: 0, fontSize: "0.82rem", opacity: (!input.trim() || loading) ? 0.5 : 1 }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
