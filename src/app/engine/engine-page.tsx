"use client";

import { useEffect, useState } from "react";

type SprintItem = { id: string; title: string; done: boolean };
type Sprint = {
  id: string; title: string; weekStart: string; weekEnd: string;
  status: "active" | "completed" | "blocked"; items: SprintItem[];
};
type EngineIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  action: { label: string; kind: "SPRINT" | "VALIDATE" | "BUILD" | "REVIEW" };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  focusMetric: string;
  evidence: string[];
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
  value: number | null;
  insight: string;
  inverse?: boolean;
};
type Genome = {
  startupHealthIndex: number | null;
  indicators: GenomeIndicator[];
  meta: Record<string, number>;
};

type Trajectory = {
  trajectory: { status: string; factors: string[] };
  executionRisk: { status: string; level: string | null; factors: string[] };
  validationRisk: { status: string; level: string | null; factors: string[] };
};

const TRAJECTORY_LABELS: Record<string, string> = {
  STRONG_POSITIVE: "Momentum fuerte",
  POSITIVE: "Buen camino",
  STABLE: "Estable",
  AT_RISK: "En riesgo",
  DECLINING: "Perdiendo momentum",
  INSUFFICIENT_DATA: "Datos insuficientes",
};

const RISK_LABELS: Record<string, string> = { LOW: "bajo", MEDIUM: "medio", HIGH: "alto" };
const RISK_BADGE: Record<string, string> = { LOW: "badge-green", MEDIUM: "badge-amber", HIGH: "badge-red" };

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

function genomeStatus(value: number | null, inverse = false) {
  if (value === null) return { label: "Datos insuficientes", color: "var(--ink-3)" };
  const v = inverse ? 100 - value : value;
  if (v >= 70) return { label: "Óptimo",    color: "var(--green)" };
  if (v >= 50) return { label: "Estable",   color: "var(--blue)" };
  if (v >= 30) return { label: "En riesgo", color: "var(--amber)" };
  return              { label: "Crítico",   color: "var(--red)" };
}

function genomeBarColor(value: number | null, inverse = false) {
  if (value === null) return "var(--ink-3)";
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
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [sprintReviews, setSprintReviews] = useState<Record<string, SprintReview>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<EngineIntelligence | null>(null);

  const total = score.execution + score.results + score.collaboration;
  const level = getLevel(total);

  async function loadEngine(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [sprintsRes, scoreRes, genomeRes, trajectoryRes, intelligenceRes] = await Promise.all([
        fetch("/api/sprints", { cache: "no-store" }),
        fetch("/api/score", { cache: "no-store" }),
        fetch("/api/engine/genome", { cache: "no-store" }),
        fetch("/api/engine/trajectory", { cache: "no-store" }),
        fetch("/api/engine/intelligence", { cache: "no-store" }),
      ]);
      if (sprintsRes.ok) setSprints(await sprintsRes.json());
      if (scoreRes.ok) setScore(await scoreRes.json());
      if (genomeRes.ok) setGenome(await genomeRes.json());
      if (trajectoryRes.ok) setTrajectory(await trajectoryRes.json());
      if (intelligenceRes.ok) {
        const payload = await intelligenceRes.json();
        setIntelligence(payload.intelligence ?? null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { void loadEngine(); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stream = new EventSource("/api/home/events");
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void loadEngine(true), 250);
    };
    stream.addEventListener("domain-event", refresh);
    return () => { if (timer) clearTimeout(timer); stream.close(); };
  }, []);

  async function toggleItem(sprintId: string, itemId: string, done: boolean) {
    const response = await fetch("/api/sprints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId, itemId, done }),
    });
    if (!response.ok) return;

    const [sprintsResponse, scoreResponse] = await Promise.all([
      fetch("/api/sprints"),
      fetch("/api/score"),
    ]);
    if (sprintsResponse.ok) setSprints(await sprintsResponse.json());
    if (scoreResponse.ok) setScore(await scoreResponse.json());
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
    if (!res.ok) { setSaving(false); return; }
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

  function runIntelligenceAction() {
    if (!intelligence) { setCreating(true); return; }
    if (intelligence.action.kind === "SPRINT") setCreating(true);
    if (intelligence.action.kind === "VALIDATE") window.location.href = "/validate";
    if (intelligence.action.kind === "BUILD") window.location.href = "/build";
    if (intelligence.action.kind === "REVIEW") document.getElementById("engine-sprints")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="engine-shell">
      <header className="engine-context">
        <div>
          <span className="home-eyebrow">Operating cadence</span>
          <h1>Engine</h1>
          <p>Convert priorities and evidence into weekly commitments, measurable throughput and execution learning.</p>
        </div>
        <div className="engine-context-meta">
          <span className="home-eyebrow">Current level</span>
          <strong>{level.label}</strong>
          <small>{total} execution points · {sprints.length} sprint(s)</small>
        </div>
      </header>

      <section className={`engine-command engine-command-${(intelligence?.status ?? "SETUP").toLowerCase()}`}>
        <div className="engine-command-rail">
          <span className="home-eyebrow">Engine Intelligence</span>
          <span className="engine-command-status">{intelligence?.status ?? "SETUP"}</span>
        </div>
        <div>
          <span className="engine-command-kicker">{intelligence?.focusMetric ?? "Execution focus"}</span>
          <h2>{intelligence?.title ?? "Create an operating cycle."}</h2>
          <p>{intelligence?.explanation ?? "VELA needs a Sprint before it can evaluate execution reliability."}</p>
        </div>
        <div className="engine-command-action">
          <button className="btn-primary" onClick={runIntelligenceAction}>{intelligence?.action.label ?? "Create Sprint"} <span aria-hidden="true">→</span></button>
          <small>{intelligence?.confidence ?? "LOW"} confidence · execution evidence</small>
        </div>
      </section>

      {genome && (
        <section className="engine-intelligence-strip">
          <EngineStat label="Startup Health" value={genome.startupHealthIndex ?? "—"} note="composite operating index" />
          <EngineStat label="Execution Velocity" value={genome.indicators.find((item) => item.id === "velocity")?.value ?? "—"} note="throughput and cadence" />
          <EngineStat label="PMF Evidence" value={genome.indicators.find((item) => item.id === "pmf")?.value ?? "—"} note="validation strength" />
          <EngineStat label="Operational Health" value={genome.indicators.find((item) => item.id === "health")?.value ?? "—"} note="objective reliability" />
        </section>
      )}

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
              <div style={{ fontSize: "2.6rem", fontWeight: 900, color: shiColor(genome.startupHealthIndex ?? 0), lineHeight: 1 }}>
                {genome.startupHealthIndex === null ? "—" : genome.startupHealthIndex}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>/ 100</div>
            </div>
          </div>

          {/* Trajectory — baseline predictions over real data (rules-v1) */}
          {trajectory && (
            <div className="os-card" style={{ marginBottom: "1rem", padding: "1rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.2rem" }}>
                    Trayectoria
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>
                    {TRAJECTORY_LABELS[trajectory.trajectory.status] ?? trajectory.trajectory.status}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {trajectory.executionRisk.status === "AVAILABLE" && (
                    <span className={`badge ${RISK_BADGE[trajectory.executionRisk.level ?? "LOW"]}`}>
                      Ejecución: {RISK_LABELS[trajectory.executionRisk.level ?? "LOW"]}
                    </span>
                  )}
                  {trajectory.validationRisk.status === "AVAILABLE" && (
                    <span className={`badge ${RISK_BADGE[trajectory.validationRisk.level ?? "LOW"]}`}>
                      Validación: {RISK_LABELS[trajectory.validationRisk.level ?? "LOW"]}
                    </span>
                  )}
                </div>
              </div>
              <ul style={{ marginTop: "0.6rem", paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>
                {trajectory.trajectory.factors.map((factor) => (
                  <li key={factor} style={{ fontSize: "0.78rem", color: "var(--ink-2)" }}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

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
                      {ind.value === null ? "—" : ind.value}<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ind.value === null ? "" : "%"}</span>
                    </div>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, color: status.color,
                      background: `${status.color}1a`, padding: "0.15rem 0.55rem", borderRadius: 4,
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <div className="os-progress" style={{ height: 3, marginBottom: "0.6rem" }}>
                    <div className="os-progress-fill" style={{ width: `${ind.value ?? 0}%`, background: barColor, transition: "width 0.6s ease" }} />
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
      <div id="engine-sprints" className="engine-sprint-list">
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

function EngineStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="engine-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
}
