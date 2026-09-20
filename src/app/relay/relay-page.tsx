"use client";

import { useEffect, useState, FormEvent } from "react";
import PlatformGraphView from "./platform-graph-view";

type Session = { name: string; email: string; role: string; sub: string };

type Thread = {
  id: string;
  title: string;
  body: string;
  category: "update" | "blocker" | "decision" | "win";
  authorName: string;
  authorRole: string;
  pinned: boolean;
  createdAt: string;
};

type RelayIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  action: { label: string; target: "BLOCKERS" | "DECISIONS" | "NETWORK" | "PUBLISH" };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  focus: string;
  health: {
    openBlockers: number;
    staleBlockers: number;
    pendingDecisions: number;
    staleDecisions: number;
    recentActivity: number;
    connections: number;
    collaborationConnections: number;
  };
};

type Decision = {
  id: string;
  title: string;
  context: string;
  choice: string;
  rationale: string;
  outcome?: string;
  ownerName: string;
  createdAt: string;
};

const CATEGORIES = [
  { value: "update",   label: "Update",   badge: "badge-ghost", icon: "↗" },
  { value: "blocker",  label: "Bloqueo",  badge: "badge-red",   icon: "⛔" },
  { value: "decision", label: "Decisión", badge: "badge-blue",  icon: "◆" },
  { value: "win",      label: "Victoria", badge: "badge-green", icon: "★" },
];

export default function RelayPage({ session }: { session: Session }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState({ title: "", body: "", category: "update" });

  const [activeTab, setActiveTab] = useState<"feed" | "decisions" | "red">("feed");
  const [intelligence, setIntelligence] = useState<RelayIntelligence | null>(null);

  // Decision Log state
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showDecForm, setShowDecForm] = useState(false);
  const [savingDec, setSavingDec] = useState(false);
  const [decForm, setDecForm] = useState({ title: "", context: "", choice: "", rationale: "" });
  const [outcomeInputs, setOutcomeInputs] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const [tRes, dRes, iRes] = await Promise.all([
        fetch("/api/threads?limit=50", { cache: "no-store" }),
        fetch("/api/decisions", { cache: "no-store" }),
        fetch("/api/relay/intelligence", { cache: "no-store" }),
      ]);
      if (tRes.ok) setThreads(await tRes.json());
      if (dRes.ok) setDecisions(await dRes.json());
      if (iRes.ok) {
        const payload = await iRes.json();
        setIntelligence(payload.intelligence ?? null);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stream = new EventSource("/api/home/events");
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 250);
    };
    stream.addEventListener("domain-event", refresh);
    return () => {
      if (timer) clearTimeout(timer);
      stream.close();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, body: form.body, category: form.category }),
    });
    setForm({ title: "", body: "", category: "update" });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function handleDecSubmit(e: FormEvent) {
    e.preventDefault();
    if (!decForm.title.trim()) return;
    setSavingDec(true);
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decForm),
    });
    if (res.ok) {
      const created = await res.json();
      setDecisions((prev) => [created, ...prev]);
    }
    setDecForm({ title: "", context: "", choice: "", rationale: "" });
    setShowDecForm(false);
    setSavingDec(false);
  }

  async function recordOutcome(id: string) {
    const outcome = outcomeInputs[id];
    if (!outcome?.trim()) return;
    const res = await fetch("/api/decisions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, outcome }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDecisions((prev) => prev.map((d) => d.id === id ? updated : d));
      setOutcomeInputs((p) => ({ ...p, [id]: "" }));
    }
  }

  async function deleteDecision(id: string) {
    await fetch(`/api/decisions?id=${id}`, { method: "DELETE" });
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  }

  async function deleteThread(id: string) {
    if (!confirm("¿Eliminar este thread?")) return;
    await fetch("/api/threads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const displayed = filter === "all" ? threads : threads.filter((t) => t.category === filter);
  const canDelete = session.role !== "operador";

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.value] = threads.filter((t) => t.category === c.value).length;
    return acc;
  }, {} as Record<string, number>);

  const blockers = intelligence?.health.openBlockers ?? counts.blocker ?? 0;
  const pendingDecisions = intelligence?.health.pendingDecisions ?? decisions.filter((d) => !d.outcome).length;
  const relayStatus = intelligence?.status ?? (blockers > 0 ? "ATTENTION" : pendingDecisions > 0 ? "FOCUS" : threads.length || decisions.length ? "STABLE" : "SETUP");
  const relayTitle = intelligence?.title ?? "Create the first shared operating signal.";
  const relayExplanation = intelligence?.explanation ?? "VELA needs collaboration activity before it can assess Relay health.";

  function runRelayAction() {
    const target = intelligence?.action.target;
    if (target === "BLOCKERS") { setActiveTab("feed"); setFilter("blocker"); return; }
    if (target === "DECISIONS") { setActiveTab("decisions"); return; }
    if (target === "NETWORK") { setActiveTab("red"); return; }
    setActiveTab("feed");
    setShowForm(true);
  }

  return (
    <div className="relay-shell">
      <header className="relay-context">
        <div>
          <span className="home-eyebrow">Collaboration system</span>
          <h1>Relay</h1>
          <p>Coordinate operating updates, blockers, decisions and ecosystem relationships in one shared execution layer.</p>
        </div>
        <div className="relay-context-meta">
          <span className="home-eyebrow">Operator</span>
          <strong>{session.name}</strong>
          <small>{threads.length} signals · {decisions.length} decisions</small>
        </div>
      </header>

      <section className={`relay-command relay-command-${relayStatus.toLowerCase()}`}>
        <div className="relay-command-rail">
          <span className="home-eyebrow">Relay Pulse</span>
          <span className="relay-command-status">{relayStatus}</span>
        </div>
        <div>
          <span className="relay-command-kicker">{intelligence?.focus ?? (blockers ? "Open blockers" : pendingDecisions ? "Decision learning" : "Collaboration health")}</span>
          <h2>{relayTitle}</h2>
          <p>{relayExplanation}</p>
        </div>
        <div className="relay-command-action">
          <button className="btn-primary" onClick={runRelayAction}>
            {intelligence?.action.label ?? (blockers ? "Review blockers" : pendingDecisions ? "Review decisions" : "Publish update")} <span aria-hidden="true">→</span>
          </button>
          <small>{intelligence?.confidence ?? "LOW"} confidence · persisted collaboration evidence</small>
        </div>
      </section>

      <section className="relay-intelligence-strip">
        <RelayStat label="Updates" value={counts.update ?? 0} note="operating signals" />
        <RelayStat label="Blockers" value={blockers} note={intelligence?.health.staleBlockers ? `${intelligence.health.staleBlockers} stale` : "need collaboration"} />
        <RelayStat label="Decisions" value={decisions.length} note={`${pendingDecisions} awaiting outcome`} />
        <RelayStat label="Network" value={intelligence?.health.connections ?? 0} note={`${intelligence?.health.collaborationConnections ?? 0} collaboration paths`} />
      </section>

      {/* Tab bar */}
      <div className="relay-tabs">
        {([
          { id: "feed", label: "Feed Relay", count: threads.length },
          { id: "decisions", label: "Decision Log", count: decisions.length },
          { id: "red", label: "Red", count: null },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={activeTab === tab.id ? "is-active" : ""}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{ fontSize: "0.72rem", background: "var(--surface-2)", borderRadius: 10, padding: "0.1rem 0.45rem" }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="relay-workspace">

        {/* ── FEED TAB ── */}
        {activeTab === "feed" && (
          <>
            {/* Sidebar filter */}
            <aside className="relay-filter-panel">
              <div className="relay-filter-label">Filter by signal</div>
              <button type="button" onClick={() => setFilter("all")} className={filter === "all" ? "is-active" : ""}>
                <span>Todos</span>
                <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{threads.length}</span>
              </button>
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setFilter(filter === c.value ? "all" : c.value)} className={filter === c.value ? "is-active" : ""}>
                  <span>{c.icon} {c.label}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{counts[c.value] ?? 0}</span>
                </button>
              ))}
              <div className="os-divider" style={{ margin: "0.75rem 0" }} />
              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--ink-3)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--ink-2)" }}>↗ Update</strong> — Comparte avances, números, próximos pasos.<br/><br/>
                <strong style={{ color: "var(--red)" }}>⛔ Bloqueo</strong> — Algo frena tu progreso. Pide ayuda.<br/><br/>
                <strong style={{ color: "var(--blue)" }}>◆ Decisión</strong> — Cuéntale al equipo qué decidiste y por qué.<br/><br/>
                <strong style={{ color: "var(--green)" }}>★ Victoria</strong> — Celebra un hito real. Motiva al ecosistema.
              </div>
            </aside>

            {/* Main feed */}
            <div className="relay-feed">
              {showForm && (
                <form onSubmit={handleSubmit} className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.875rem", border: "1px solid var(--accent)" }}>
                  <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>Nueva publicación</h3>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.value} type="button" onClick={() => setForm({ ...form, category: c.value })} className={`badge ${c.badge}`} style={{ cursor: "pointer", border: form.category === c.value ? "1px solid currentColor" : "1px solid transparent" }}>
                        {c.icon} {c.label}
                      </button>
                    ))}
                  </div>
                  <input className="os-input" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  <textarea className="os-input os-textarea" placeholder="Detalla tu mensaje..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} required />
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Publicando…" : "Publicar"}</button>
                    <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[0,1,2,3].map(i => <div key={i} style={{ height: 90, borderRadius: "0.875rem", background: "var(--surface)" }} />)}
                </div>
              ) : displayed.length === 0 ? (
                <div className="os-card" style={{ textAlign: "center", padding: "2.5rem" }}>
                  <p style={{ color: "var(--ink-3)", marginBottom: "0.75rem" }}>Nada publicado aún. Sé el primero en compartir.</p>
                  <button onClick={() => setShowForm(true)} className="btn-primary">+ Publicar</button>
                </div>
              ) : (
                displayed.map((t) => {
                  const cat = CATEGORIES.find((c) => c.value === t.category)!;
                  return (
                    <div key={t.id} className={`os-card os-hover-lift ${t.pinned ? "os-card-accent" : ""}`}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                            <span className={`badge ${cat.badge}`}>{cat.icon} {cat.label}</span>
                            {t.pinned && <span className="badge badge-accent">Destacado</span>}
                            <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{t.authorName} · {new Date(t.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span>
                          </div>
                          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.4rem", letterSpacing: "-0.01em" }}>{t.title}</p>
                          <p style={{ fontSize: "0.85rem", color: "var(--ink-2)", lineHeight: 1.6 }}>{t.body}</p>
                        </div>
                        {canDelete && (
                          <button onClick={() => deleteThread(t.id)} style={{ color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", flexShrink: 0 }}>Eliminar</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ── DECISIONS TAB ── */}
        {activeTab === "decisions" && (
          <div className="relay-decisions">
            <div className="os-card" style={{ background: "var(--surface-2)", border: "none", fontSize: "0.82rem", color: "var(--ink-2)", lineHeight: 1.65 }}>
              <strong style={{ color: "var(--ink)" }}>¿Qué es el Decision Log?</strong><br/>
              Registra las decisiones importantes de tu startup: qué decidiste, por qué, y qué resultó. Con el tiempo, este historial se convierte en tu diario estratégico y te ayuda a aprender de cada pivote.
            </div>
            {showDecForm && (
              <form onSubmit={handleDecSubmit} className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", border: "1px solid var(--accent)" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>Nueva decisión</div>
                <input className="os-input" placeholder="Título de la decisión (ej: Pivotar a B2B)" value={decForm.title} onChange={(e) => setDecForm({ ...decForm, title: e.target.value })} required />
                <textarea className="os-input os-textarea" placeholder="Contexto: ¿qué situación te llevó a esto?" value={decForm.context} onChange={(e) => setDecForm({ ...decForm, context: e.target.value })} rows={2} />
                <input className="os-input" placeholder="Decisión tomada" value={decForm.choice} onChange={(e) => setDecForm({ ...decForm, choice: e.target.value })} />
                <textarea className="os-input os-textarea" placeholder="Razonamiento: ¿por qué esta opción?" value={decForm.rationale} onChange={(e) => setDecForm({ ...decForm, rationale: e.target.value })} rows={2} />
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="submit" className="btn-primary" disabled={savingDec}>{savingDec ? "Guardando…" : "Guardar"}</button>
                  <button type="button" className="btn-ghost" onClick={() => setShowDecForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
            {decisions.length === 0 && !showDecForm ? (
              <div className="os-card" style={{ textAlign: "center", padding: "2.5rem" }}>
                <p style={{ color: "var(--ink-3)", marginBottom: "1rem" }}>Ninguna decisión registrada todavía.</p>
                <button className="btn-primary" onClick={() => setShowDecForm(true)}>+ Registrar primera decisión</button>
              </div>
            ) : (
              decisions.map((d) => (
                <div key={d.id} className="os-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                        <span className={`badge ${d.outcome ? "badge-green" : "badge-ghost"}`}>{d.outcome ? "Con resultado" : "Pendiente"}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>{d.ownerName} · {new Date(d.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span>
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.4rem" }}>{d.title}</div>
                      {d.context && <div style={{ fontSize: "0.82rem", color: "var(--ink-3)", marginBottom: "0.25rem" }}>Contexto: {d.context}</div>}
                      {d.choice && <div style={{ fontSize: "0.82rem", color: "var(--ink-2)", marginBottom: "0.25rem" }}>◆ {d.choice}</div>}
                      {d.rationale && <div style={{ fontSize: "0.8rem", color: "var(--ink-3)", fontStyle: "italic", marginBottom: "0.25rem" }}>{d.rationale}</div>}
                      {d.outcome && <div style={{ fontSize: "0.82rem", color: "var(--green)", marginTop: "0.4rem" }}>Resultado: {d.outcome}</div>}
                      {!d.outcome && (
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                          <input className="os-input" placeholder="Registrar resultado…" value={outcomeInputs[d.id] ?? ""} onChange={(e) => setOutcomeInputs((p) => ({ ...p, [d.id]: e.target.value }))} style={{ flex: 1, fontSize: "0.8rem" }} />
                          <button className="btn-ghost" onClick={() => recordOutcome(d.id)} style={{ fontSize: "0.78rem" }}>Guardar</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteDecision(d.id)} style={{ color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", flexShrink: 0, marginLeft: "1rem" }}>×</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── RED TAB ── */}
        {activeTab === "red" && (
          <div className="relay-network">
            <div className="os-card" style={{ padding: "1rem 1.25rem", background: "var(--surface-2)", border: "1px solid var(--border)", margin: "0 2.5rem" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.4rem" }}>Red de colaboración</div>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-3)", lineHeight: 1.7 }}>
                Visualiza la red del ecosistema VELA: conexiones sociales, herramientas usadas y comunidades clave.
                Usa este espacio para descubrir puentes, influencers y oportunidades de colaboración.
              </div>
            </div>
            <div style={{ flex: 1, margin: "0 2.5rem" }}>
              <PlatformGraphView currentUserId={session.sub} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function RelayStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="relay-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
