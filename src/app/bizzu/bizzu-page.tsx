"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const PHASES = [
  { label: "Problema", range: [1, 2] },
  { label: "Solución", range: [3, 4] },
  { label: "Mercado", range: [5, 6] },
  { label: "Estado actual", range: [7, 8] },
  { label: "Próximo paso", range: [9, 9] },
  { label: "Análisis", range: [10, 10] },
];

function getPhase(userCount: number) {
  if (userCount <= 2) return 0;
  if (userCount <= 4) return 1;
  if (userCount <= 6) return 2;
  if (userCount <= 8) return 3;
  if (userCount <= 9) return 4;
  return 5;
}

function renderMarkdown(text: string) {
  return text
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)", margin: "1rem 0 0.5rem" }}>{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink-2)", margin: "0.75rem 0 0.25rem" }}>{line.slice(4)}</h3>;
      if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.75rem 0" }} />;
      // Bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, j) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={j} style={{ color: "var(--ink)" }}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>
      );
      if (line.match(/^\d+\./)) return <p key={i} style={{ margin: "0.2rem 0", paddingLeft: "0.5rem" }}>{rendered}</p>;
      if (line.startsWith("- ")) return <p key={i} style={{ margin: "0.2rem 0", paddingLeft: "0.75rem" }}>• {rendered.map((r, j) => React.cloneElement(r, { key: j }))}</p>;
      return <p key={i} style={{ margin: line ? "0.15rem 0" : "0.4rem 0" }}>{rendered}</p>;
    });
}

// Need React import for cloneElement
import React from "react";

const WELCOME: Message = {
  role: "assistant",
  content: "Hola, soy **BiZZu**, tu co-fundador digital en VELA.\n\nVoy a hacerte una serie de 9 preguntas para entender tu proyecto y ayudarte a estructurarlo con rigor. No hay respuestas correctas o incorrectas — solo sé honesto.\n\n**Pregunta 1/9:** ¿Cuál es el problema que quieres resolver? Descríbelo como si se lo explicaras a alguien que no conoce tu industria.",
};

type Props = { userName: string; userRole: string };

export default function BizzuPage({ userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userCount = messages.filter((m) => m.role === "user").length;
  const currentPhase = getPhase(userCount);
  const isComplete = userCount >= 9 && messages.some((m) => m.role === "assistant" && m.content.includes("Análisis BiZZu"));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (!started) setStarted(true);
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/bizzu/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error. Intenta de nuevo." }]);
        setLoading(false);
        return;
      }
      setLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const arr = [...prev];
          const last = arr[arr.length - 1];
          if (last?.role === "assistant") {
            arr[arr.length - 1] = { ...last, content: last.content + chunk };
          }
          return arr;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexión. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 0px)", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: "1px solid var(--border)",
        padding: "2rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem",
        background: "var(--surface)",
      }}>
        {/* BiZZu identity */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #e85c2e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "0.75rem",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>Bz</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>BiZZu</div>
          <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginTop: "0.15rem" }}>Tu co-fundador digital</div>
        </div>

        {/* Phase progress */}
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
          Progreso
        </div>
        {PHASES.map((phase, i) => {
          const done = i < currentPhase;
          const active = i === currentPhase;
          return (
            <div key={phase.label} style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.4rem 0.5rem", borderRadius: 6,
              background: active ? "var(--surface-2)" : "transparent",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: 700,
                background: done ? "var(--green)" : active ? "var(--accent)" : "var(--surface-3)",
                color: done || active ? "#fff" : "var(--ink-3)",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "0.8rem", color: active ? "var(--ink)" : done ? "var(--ink-2)" : "var(--ink-3)", fontWeight: active ? 600 : 400 }}>
                {phase.label}
              </span>
            </div>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--ink-3)", lineHeight: 1.5 }}>
            BiZZu analiza tu startup y genera un plan de acción personalizado basado en tus respuestas.
          </p>
          {isComplete && (
            <button
              onClick={() => { setMessages([WELCOME]); setStarted(false); }}
              className="btn-ghost"
              style={{ marginTop: "0.75rem", width: "100%", fontSize: "0.78rem", justifyContent: "center" }}
            >
              Nueva sesión
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 2rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>
              {isComplete ? "Análisis completado" : `Fase ${currentPhase + 1} — ${PHASES[currentPhase]?.label}`}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
            {userName} · Pregunta {Math.min(userCount + 1, 9)}/9
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: "0.75rem", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: "linear-gradient(135deg, #7c3aed, #e85c2e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", fontWeight: 900, color: "#fff",
                }}>Bz</div>
              )}
              <div style={{
                maxWidth: "70%", padding: "0.75rem 1rem",
                borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                background: m.role === "user" ? "var(--accent)" : "var(--surface)",
                border: m.role === "assistant" ? "1px solid var(--border)" : "none",
                fontSize: "0.85rem", color: m.role === "user" ? "#fff" : "var(--ink-2)",
                lineHeight: 1.6,
              }}>
                {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #e85c2e)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: 900, color: "#fff",
              }}>Bz</div>
              <div style={{ padding: "0.75rem 1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px 14px 14px 2px", display: "flex", gap: 4 }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-3)", display: "inline-block", animation: `pulse 1.2s ${d * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!isComplete && (
          <div style={{ padding: "1rem 2rem 1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe tu respuesta... (Enter para enviar)"
              rows={2}
              className="os-input"
              style={{ flex: 1, resize: "none", fontSize: "0.88rem", lineHeight: 1.5 }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", flexShrink: 0, opacity: (!input.trim() || loading) ? 0.5 : 1 }}
            >
              Enviar
            </button>
          </div>
        )}
        {isComplete && (
          <div style={{ padding: "1rem 2rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <a href="/build" className="btn-primary">Ir a Build →</a>
            <a href="/validate" className="btn-ghost">Ir a Validate →</a>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:.3;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}
