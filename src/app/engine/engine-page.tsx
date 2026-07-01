"use client";

import { useEffect, useState } from "react";

type SprintItem = { id: string; title: string; done: boolean };
type Sprint = {
  id: string; title: string; weekStart: string; weekEnd: string;
  status: "active" | "completed" | "blocked"; items: SprintItem[];
};
type SprintReview = {
  summary: string;
  wins: string[];
  blockers: string[];
  nextWeek: string[];
};

type GenomeIndicator = {
  id: string;
  label: string;
  value: number;
  insight: string;
  inverse?: boolean;
};
type Genome = {
  startupHealthIndex: number;
  indicators: GenomeIndicator[];
  meta: Record<string, number>;
};

const LEVEL_THRESHOLDS = [
  { min: 0,   max: 49,  label: "Early Builder", color: "var(--ink-3)" },
  { min: 50,  max: 149, label: "Operator",      color: "var(--blue)" },
  { min: 150, max: 299, label: "Scaler",         color: "var(--amber)" },
  { min: 300, max: Infinity, label: "Founder Elite", color: "var(--accent)" },
];

function getLevel(total: number) {
  return LEVEL_THRESHOLDS.find((l) => total >= l.min && total <= l.max) ?? LEVEL_THRESHOLDS[0];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

function shiColor(v: number) {
  if (v >= 70) return "var(--green)";
  if (v >= 50) return "var(--blue)";
  if (v >= 30) return "var(--amber)";
  return "var(--red)";
}

function genomeStatus(value: number, inverse = false) {
  const v = inverse ? 100 - value : value;
  if (v >= 70) return { label: "Óptimo",    color: "var(--green)" };
  if (v >= 50) return { label: "Estable",   color: "var(--blue)" };
  if (v >= 30) return { label: "En riesgo", color: "var(--amber)" };
  return              { label: "Crítico",   color: "var(--red)" };
}

function genomeBarColor(value: number, inverse = false) {
  if (!inverse) {
    if (value >= 70) return "var(--green)";
    if (value >= 50) return "var(--blue)";
    if (value >= 30) return "var(--amber)";
    return "var(--red)";
  }
  if (value <= 25) return "var(--green)";
  if (value <= 50) return "var(--amber)";
  return "var(--red)";
}

export default function ExecutionEngine() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [score, setScore] = useState({ execution: 0, results: 0, collaboration: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split("T")[0];
  });
  const [commitInputs, setCommitInputs] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [genome, setGenome] = useState<Genome | null>(null);
  const [sprintReviews, setSprintReviews] = useState<Record<string, SprintReview>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const total = score.execution + score.results + score.collaboration;
  const level = getLevel(total);

  useEffect(() => {
    Promise.all([
      fetch("/api/sprints").then((r) => r.json()),
      fetch("/api/score").then((r) => r.json()),
      fetch("/api/engine/genome").then((r) => r.json()),
    ]).then(([s, sc, g]) => {
      setSprints(s);
      setScore(sc);
      setGenome(g);
      setLoading(false);
    });
  }, []);

  async function toggleItem(sprintId: string, itemId: string, done: boolean) {
    await fetch("/api/sprints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId, itemId, done }),
    });
    setSprints((prev) =>
      prev.map((sp) => {
        if (sp.id !== sprintId) return sp;
        const newItems = sp.items.map((it) => (it.id === itemId ? { ...it, done } : it));
        const allDone = newItems.every((it) => it.done);
        return { ...sp, items: newItems, status: allDone ? "completed" : sp.status };
      })
    );
    if (done) {
      const sprint = sprints.find((s) => s.id === sprintId);
      if (sprint) {
        const allDone = sprint.items.filter((i) => i.id !== itemId).every((i) => i.done);
        if (allDone) setScore((s) => ({ ...s, execution: s.execution + 10 }));
      }
    }
  }

  async function createSprint() {
    const commits = commitInputs.filter((c) => c.trim());
    if (!title || commits.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, weekStart, commitments: commits }),
    });
    const data = await res.json();
    setSprints((prev) => [data, ...prev]);
    setTitle(""); setCommitInputs(["", "", ""]); setCreating(false); setSaving(false);
  }

  async function deleteSprint(id: string) {
    await fetch(`/api/sprints?id=${id}`, { method: "DELETE" });
    setSprints((prev) => prev.filter((s) => s.id !== id));
  }

  async function analyzeSprintWithAI(sprint: Sprint) {
    if (reviewingId) return;
    setReviewingId(sprint.id);
    try {
      const res = await fetch("/api/ai/sprint-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: sprint.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setSprintReviews((prev) => ({ ...prev, [sprint.id]: data.review }));
      }
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) return <div style={{ padding: "2rem", color: "var(--ink-3)" }}>Cargando...</div>;

  return (
    <div style={{ padding: "2.5rem 2rem 4rem" }}>
      {/* Header */}
      <div className="os-page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="os-page-title">Execution Engine</h1>
          <p className="os-page-sub">Compromisos semanales. Si no ejecutas, no avanzas.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">+ Nuevo sprint</button>
      </div>

      {/* ── Startup Genome Engine ─────────────────────────────── */}
      {genome && (
        <section style={{ marginBottom: "2.5rem" }}>
          {/* SHI header */}
          <div className="os-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", padding: "1.1rem 1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.2rem" }}>
                Startup Genome Engine
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>Señales predictivas de ejecución</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: "0.15rem" }}>
                {genome.meta.totalSignals} señales · {genome.meta.totalObjectives} objetivos · {genome.meta.totalSprints} sprints · {genome.meta.totalDecisions} decisiones
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.15rem" }}>Startup Health Index</div>
              <div style={{ fontSize: "2.6rem", fontWeight: 900, color: shiColor(genome.startupHealthIndex), lineHeight: 1 }}>
                {genome.startupHealthIndex}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>/ 100</div>
            </div>
          </div>

          {/* 6 indicators grid */}
          <div className="os-grid-3" style={{ gap: "0.75rem" }}>
            {genome.indicators.map((ind) => {
              const status = genomeStatus(ind.value, ind.inverse);
              const barColor = genomeBarColor(ind.value, ind.inverse);
              return (
                <div key={ind.id} className="os-card-sm" style={{ padding: "1rem 1.1rem" }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.6rem" }}>
                    {ind.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.55rem" }}>
                    <div style={{ fontSize: "1.9rem", fontWeight: 900, color: barColor, lineHeight: 1 }}>
                      {ind.value}<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>%</span>
                    </div>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, color: status.color,
                      background: `${status.color}1a`, padding: "0.15rem 0.55rem", borderRadius: 4,
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <div className="os-progress" style={{ height: 3, marginBottom: "0.6rem" }}>
                    <div className="os-progress-fill" style={{ width: `${ind.value}%`, background: barColor, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontSize: "0.71rem", color: "var(--ink-3)", lineHeight: 1.4 }}>{ind.insight}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Score + Level */}
      <div className="os-grid-3" style={{ gap: "1rem", marginBottom: "2.5rem" }}>
        <div className="os-card" style={{ gridColumn: "span 2" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.35rem" }}>Tu nivel</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: level.color }}>{level.label}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)", marginTop: "0.2rem" }}>{total} puntos totales</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {LEVEL_THRESHOLDS.map((l, i) => (
                <div key={l.label} style={{ fontSize: "0.75rem", color: total >= l.min ? l.color : "var(--ink-3)", fontWeight: total >= l.min ? 600 : 400, marginBottom: "0.15rem" }}>
                  {i === 0 ? "" : `${l.min}+ `}{l.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[
              { label: "Ejecución", value: score.execution, color: "var(--green)" },
              { label: "Resultados", value: score.results, color: "var(--blue)" },
              { label: "Colaboración", value: score.collaboration, color: "var(--amber)" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-3)" }}>Sprints</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--ink)" }}>{sprints.length}</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { label: "activos", count: sprints.filter((s) => s.status === "active").length, color: "badge-green" },
              { label: "completos", count: sprints.filter((s) => s.status === "completed").length, color: "badge-blue" },
              { label: "bloqueados", count: sprints.filter((s) => s.status === "blocked").length, color: "badge-red" },
            ].map((st) => (
              <span key={st.label} className={`badge ${st.color}`}>{st.count} {st.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="os-card" style={{ marginBottom: "2rem", borderColor: "var(--accent)", border: "1px solid var(--accent)" }}>
          <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "1rem" }}>Nuevo Sprint Semanal</div>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <input className="os-input" placeholder="Nombre del sprint (ej: Validar con 5 clientes)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 2, minWidth: 200 }} />
            <input type="date" className="os-input" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginBottom: "0.5rem" }}>Compromisos de la semana (mínimo 1):</div>
          {commitInputs.map((c, i) => (
            <input
              key={i} className="os-input" value={c}
              onChange={(e) => setCommitInputs((prev) => prev.map((v, j) => j === i ? e.target.value : v))}
              placeholder={`Compromiso ${i + 1}`}
              style={{ marginBottom: "0.5rem" }}
            />
          ))}
          <button className="btn-ghost" onClick={() => setCommitInputs((p) => [...p, ""])} style={{ fontSize: "0.78rem", marginBottom: "1rem" }}>+ Agregar compromiso</button>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn-primary" onClick={createSprint} disabled={saving || !title || !commitInputs.some((c) => c.trim())}>
              {saving ? "Guardando..." : "Crear sprint"}
            </button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Sprint list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {sprints.length === 0 && !creating && (
          <div className="os-card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--ink-3)", marginBottom: "1rem" }}>No hay sprints activos. Define tus compromisos de esta semana.</p>
            <button className="btn-primary" onClick={() => setCreating(true)}>+ Crear primer sprint</button>
          </div>
        )}
        {sprints.map((sprint) => {
          const doneCount = sprint.items.filter((i) => i.done).length;
          const pct = sprint.items.length ? Math.round((doneCount / sprint.items.length) * 100) : 0;
          const statusColor = sprint.status === "completed" ? "var(--green)" : sprint.status === "blocked" ? "var(--red)" : "var(--amber)";

          return (
            <div key={sprint.id} className="os-card" style={{ borderLeft: `3px solid ${statusColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.95rem" }}>{sprint.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: "0.2rem" }}>
                    {formatDate(sprint.weekStart)} — {formatDate(sprint.weekEnd)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span className={`badge ${sprint.status === "completed" ? "badge-green" : sprint.status === "blocked" ? "badge-red" : "badge-amber"}`}>
                    {sprint.status === "completed" ? "Completado" : sprint.status === "blocked" ? "Bloqueado" : "Activo"}
                  </span>
                  <button onClick={() => deleteSprint(sprint.id)} className="btn-ghost" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>×</button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="os-progress" style={{ marginBottom: "1rem" }}>
                <div className="os-progress-fill" style={{ width: `${pct}%`, background: sprint.status === "blocked" ? "var(--red)" : undefined }} />
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginBottom: "0.75rem" }}>{doneCount}/{sprint.items.length} compromisos · {pct}%</div>

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {sprint.items.map((item) => (
                  <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: sprint.status !== "blocked" ? "pointer" : "default" }}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={sprint.status === "blocked"}
                      onChange={(e) => toggleItem(sprint.id, item.id, e.target.checked)}
                      style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "0.85rem", color: item.done ? "var(--ink-3)" : "var(--ink-2)", textDecoration: item.done ? "line-through" : "none" }}>
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>

              {sprint.status === "blocked" && (
                <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--red-bg)", borderRadius: 6, fontSize: "0.78rem", color: "var(--red)" }}>
                  ⚠ Este sprint fue bloqueado por falta de ejecución. Completa tus compromisos antes de crear uno nuevo.
                </div>
              )}

              {/* ── Sprint Review IA ── */}
              {sprintReviews[sprint.id] ? (
                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.6rem" }}>
                    ✦ Análisis de Sprint
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-2)", lineHeight: 1.55, marginBottom: "0.75rem" }}>
                    {sprintReviews[sprint.id].summary}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    {[
                      { label: "✓ Logros", items: sprintReviews[sprint.id].wins, color: "var(--green)" },
                      { label: "⚠ Pendientes", items: sprintReviews[sprint.id].blockers, color: "var(--amber)" },
                    ].map(({ label, items, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color, marginBottom: "0.35rem" }}>{label}</div>
                        {items.map((item, i) => (
                          <div key={i} style={{ fontSize: "0.76rem", color: "var(--ink-3)", marginBottom: "0.2rem" }}>• {item}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--blue)", marginBottom: "0.35rem" }}>→ Próxima semana</div>
                    {sprintReviews[sprint.id].nextWeek.map((item, i) => (
                      <div key={i} style={{ fontSize: "0.76rem", color: "var(--ink-3)", marginBottom: "0.2rem" }}>• {item}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => analyzeSprintWithAI(sprint)}
                    disabled={reviewingId === sprint.id}
                    className="btn-ghost"
                    style={{ fontSize: "0.74rem", padding: "0.3rem 0.75rem", opacity: reviewingId === sprint.id ? 0.5 : 1 }}
                  >
                    {reviewingId === sprint.id ? "Analizando..." : "✦ Analizar con IA"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
