"use client";

import { useEffect, useState, FormEvent } from "react";

type Session = { name: string; email: string; role: string };

type Signal = {
  id: string;
  type: "experiment" | "interview" | "metric" | "insight";
  title: string;
  result?: string | null;
  hypothesis?: string | null;
  learning?: string | null;
  ownerName: string;
  createdAt: string;
};

type CoverageNode = {
  id: string;
  title: string;
  status: string;
  signalCount: number;
  signalTypes: string[];
};

type CoverageAnalysis = {
  blindSpots: string[];
  hubs: string[];
  coverageMap: Record<string, number>;
  coverageRatio: number;
  nextToValidate: string[];
};

const SIGNAL_TYPES = [
  { value: "experiment", label: "Experimento", icon: "⚗", desc: "Prueba de hipótesis con resultado medible", color: "var(--blue)" },
  { value: "interview",  label: "Entrevista",  icon: "💬", desc: "Conversación con usuario o cliente",        color: "var(--green)" },
  { value: "metric",     label: "Métrica",     icon: "📊", desc: "Indicador cuantitativo observado",          color: "var(--amber)" },
  { value: "insight",    label: "Insight",     icon: "💡", desc: "Aprendizaje cualitativo clave",             color: "var(--accent)" },
];

const TYPE_BADGE: Record<string, string> = {
  experiment: "badge-blue",
  interview:  "badge-green",
  metric:     "badge-amber",
  insight:    "badge-accent",
};

export default function ValidatePage({ session }: { session: Session }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  // Coverage
  const [coverageNodes, setCoverageNodes] = useState<CoverageNode[]>([]);
  const [coverageAnalysis, setCoverageAnalysis] = useState<CoverageAnalysis | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);

  const [form, setForm] = useState({
    type: "experiment", title: "", result: "", hypothesis: "", learning: ""
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/signals?limit=50");
    if (res.ok) setSignals(await res.json());
    setLoading(false);
  }

  async function loadCoverage() {
    setCoverageLoading(true);
    const res = await fetch("/api/validate/coverage");
    if (res.ok) {
      const data = await res.json();
      setCoverageNodes(data.nodes ?? []);
      setCoverageAnalysis(data.analysis ?? null);
    }
    setCoverageLoading(false);
  }

  useEffect(() => { load(); loadCoverage(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ type: "experiment", title: "", result: "", hypothesis: "", learning: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function deleteSignal(id: string) {
    if (!confirm("¿Eliminar esta señal?")) return;
    await fetch("/api/signals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const displayed = filter === "all" ? signals : signals.filter((s) => s.type === filter);

  const counts = SIGNAL_TYPES.reduce((acc, t) => {
    acc[t.value] = signals.filter((s) => s.type === t.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="os-reveal" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="os-page-header">
        <div>
          <div className="os-page-title">Validate</div>
          <div className="os-page-sub">Señales de mercado, experimentos y aprendizajes</div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nueva señal</button>
      </div>

      <div style={{ padding: "1.5rem 2.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Signal type summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem" }}>
          {SIGNAL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(filter === t.value ? "all" : t.value)}
              className="os-card os-hover-lift"
              style={{ textAlign: "left", border: filter === t.value ? `1px solid ${t.color}` : undefined, cursor: "pointer", background: "var(--surface)" }}
            >
              <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)" }}>{counts[t.value] ?? 0}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: "0.1rem" }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* ── Coverage Map ── */}
        {!coverageLoading && coverageAnalysis && coverageNodes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)", letterSpacing: "-0.01em" }}>
                Mapa de Cobertura
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>
                {Math.round(coverageAnalysis.coverageRatio * 100)}% de objetivos validados
              </span>
            </div>
            <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${coverageAnalysis.coverageRatio * 100}%`, background: "var(--green)", borderRadius: 4, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
              {coverageAnalysis.blindSpots.length > 0 && (
                <div className="os-card" style={{ flex: "1 1 220px", borderLeft: "3px solid var(--red)" }}>
                  <div style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.8rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Puntos ciegos ({coverageAnalysis.blindSpots.length})
                  </div>
                  {coverageAnalysis.blindSpots.map((id) => {
                    const n = coverageNodes.find((n) => n.id === id);
                    return (
                      <div key={id} style={{ fontSize: "0.8rem", color: "var(--ink-2)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                        <span style={{ color: "var(--red)" }}>○</span>{n?.title ?? id}
                      </div>
                    );
                  })}
                </div>
              )}
              {coverageAnalysis.hubs.length > 0 && (
                <div className="os-card" style={{ flex: "1 1 220px", borderLeft: "3px solid var(--green)" }}>
                  <div style={{ fontWeight: 700, color: "var(--green)", fontSize: "0.8rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Más validados
                  </div>
                  {coverageAnalysis.hubs.map((id) => {
                    const n = coverageNodes.find((n) => n.id === id);
                    return (
                      <div key={id} style={{ fontSize: "0.8rem", color: "var(--ink-2)", display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                        <span>{n?.title ?? id}</span>
                        <span style={{ color: "var(--green)", fontWeight: 700 }}>×{n?.signalCount}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {coverageAnalysis.nextToValidate.length > 0 && (
                <div className="os-card" style={{ flex: "1 1 220px", borderLeft: "3px solid var(--accent)" }}>
                  <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "0.8rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Prioridad de validación
                  </div>
                  {coverageAnalysis.nextToValidate.map((id, i) => {
                    const n = coverageNodes.find((n) => n.id === id);
                    return (
                      <div key={id} style={{ fontSize: "0.8rem", color: "var(--ink-2)", display: "flex", gap: "0.4rem", marginBottom: "0.3rem" }}>
                        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.7rem" }}>{i + 1}.</span>
                        {n?.title ?? id}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="os-card" style={{ flex: "1 1 260px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--ink)", marginBottom: "0.5rem" }}>
                  Cobertura por objetivo
                </div>
                {coverageNodes.slice(0, 6).map((n) => (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.45rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    <div style={{ width: 60, height: 5, background: "var(--surface-2)", borderRadius: 3, flexShrink: 0 }}>
                      <div style={{ height: "100%", width: `${Math.min(n.signalCount / 5 * 100, 100)}%`, background: n.signalCount === 0 ? "var(--red)" : n.signalCount >= 3 ? "var(--green)" : "var(--amber)", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--ink-3)", flexShrink: 0 }}>{n.signalCount}</span>
                  </div>
                ))}
                {coverageNodes.length > 6 && <p style={{ fontSize: "0.72rem", color: "var(--ink-3)", textAlign: "center" }}>+{coverageNodes.length - 6} más</p>}
              </div>
            </div>
          </div>
        )}

        {/* Log form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>Registrar señal</h3>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {SIGNAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.5rem 0.875rem", borderRadius: "0.5rem",
                      border: form.type === t.value ? `1px solid ${t.color}` : "1px solid var(--border)",
                      background: form.type === t.value ? `${t.color}18` : "transparent",
                      color: form.type === t.value ? t.color : "var(--ink-3)",
                      cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <input className="os-input" placeholder="¿Qué observaste o mediste?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <input className="os-input" placeholder="Hipótesis (opcional)" value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} />
                <input className="os-input" placeholder="Resultado (opcional)" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
                <textarea className="os-input os-textarea" placeholder="Aprendizaje clave (opcional)" value={form.learning} onChange={(e) => setForm({ ...form, learning: e.target.value })} rows={2} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Registrar"}</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Signal list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[0,1,2].map(i => <div key={i} style={{ height: 80, borderRadius: "0.875rem", background: "var(--surface)" }} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="os-card" style={{ textAlign: "center", padding: "2.5rem" }}>
            <p style={{ color: "var(--ink-3)", marginBottom: "0.75rem" }}>Todavía no hay señales {filter !== "all" ? `del tipo seleccionado` : "registradas"}.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">Registrar primera señal</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {displayed.map((s) => {
              const t = SIGNAL_TYPES.find((x) => x.value === s.type)!;
              return (
                <div key={s.id} className="os-card os-hover-lift">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                        <span className={`badge ${TYPE_BADGE[s.type]}`}>{t.label}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{new Date(s.createdAt).toLocaleDateString("es-MX")}</span>
                      </div>
                      <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.35rem" }}>{s.title}</p>
                      {s.hypothesis && <p style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}><strong style={{ color: "var(--ink-2)" }}>Hipótesis:</strong> {s.hypothesis}</p>}
                      {s.result && <p style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginTop: "0.2rem" }}><strong style={{ color: "var(--ink-2)" }}>Resultado:</strong> {s.result}</p>}
                      {s.learning && (
                        <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "var(--surface-2)", borderRadius: "0.5rem", borderLeft: `3px solid ${t.color}` }}>
                          <p style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>{s.learning}</p>
                        </div>
                      )}
                    </div>
                    {session.role !== "operador" && (
                      <button onClick={() => deleteSignal(s.id)} style={{ color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", flexShrink: 0 }}>Eliminar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
