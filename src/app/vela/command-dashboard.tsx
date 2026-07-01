"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ─────────────────────────── types ───────────────────────────────────── */
type Session = { name: string; email: string; role: string };

type Objective = {
  id: string;
  title: string;
  status: "on_track" | "at_risk" | "blocked" | "completed";
  priority: number;
  dueDate?: string;
  ownerName: string;
  _count?: { signals: number };
};

type Signal = {
  id: string;
  type: "experiment" | "interview" | "metric" | "insight";
  title: string;
  createdAt: string;
};

type Sprint = {
  id: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  items: { id: string; title: string; done: boolean }[];
};

type GenomeIndicator = { id: string; label: string; value: number; insight: string; inverse?: boolean };
type Genome = { startupHealthIndex: number; indicators: GenomeIndicator[]; meta: Record<string, number> };
type AiInsight = { type: string; title: string; body: string };

/* ─────────────────────────── constants ───────────────────────────────── */
const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  on_track:  { label: "ON TRACK", color: "var(--green)" },
  at_risk:   { label: "AT RISK",  color: "var(--amber)" },
  blocked:   { label: "BLOCKED",  color: "var(--red)"   },
  completed: { label: "DONE",     color: "var(--ink-3)"  },
};

const SIGNAL_ICON: Record<string, string> = {
  experiment: "⚗",
  interview:  "◈",
  metric:     "▲",
  insight:    "◆",
};

const INSIGHT_COLOR: Record<string, string> = {
  warning: "var(--amber)",
  success: "var(--green)",
  action:  "var(--blue)",
};
const INSIGHT_ICON: Record<string, string> = { warning: "⚠", success: "✓", action: "→" };

/* ─────────────────────────── helpers ─────────────────────────────────── */
function shiColor(v: number) {
  if (v >= 70) return "var(--green)";
  if (v >= 50) return "var(--blue)";
  if (v >= 30) return "var(--amber)";
  return "var(--red)";
}

function computePhase(genome: Genome | null): string {
  if (!genome) return "—";
  const pmf = genome.indicators.find(i => i.id === "pmf")?.value ?? 0;
  const vel = genome.indicators.find(i => i.id === "velocity")?.value ?? 0;
  if (pmf >= 65 && vel >= 65) return "SCALING";
  if (pmf >= 50) return "BUILDING";
  if (pmf >= 30) return "VALIDATING";
  return "SEARCHING";
}

function metricColor(value: number, inverse = false) {
  const v = inverse ? 100 - value : value;
  if (v >= 70) return "var(--green)";
  if (v >= 45) return "var(--amber)";
  return "var(--red)";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function computeMission(genome: Genome | null, objectives: Objective[]): string {
  if (!genome) return "Analizando estado operacional...";
  const { indicators } = genome;
  const get = (id: string) => indicators.find(i => i.id === id)?.value ?? 50;

  const blocked = objectives.filter(o => o.status === "blocked");
  if (blocked.length > 0)
    return `Desbloquear ruta crítica → ${blocked[0].title}`;

  const death    = get("death");
  const pmf      = get("pmf");
  const velocity = get("velocity");
  const momentum = get("momentum");
  const readiness = get("readiness");

  if (death > 65)
    return "Reducir riesgo operacional — revisar bloqueos y burn rate activos";
  if (pmf < 30)
    return "Validar hipótesis de mercado — registrar al menos 3 señales esta semana";
  if (velocity < 35)
    return "Activar ejecución — crear sprint semanal con compromisos claros";
  const atRisk = objectives.filter(o => o.status === "at_risk");
  if (atRisk.length > 0)
    return `Rescatar objetivo en riesgo → ${atRisk[0].title}`;
  if (momentum < 35)
    return "Reforzar colaboración del equipo — iniciar thread y tomar decisiones";
  if (readiness < 40)
    return "Fortalecer fundamentos operacionales antes de buscar capital";
  return "Mantener momentum — ejecutar sprint y registrar señales de validación";
}

/* ─────────────────────────── component ──────────────────────────────── */
export default function CommandDashboard({ session }: { session: Session }) {
  const [genome, setGenome]             = useState<Genome | null>(null);
  const [objectives, setObjectives]     = useState<Objective[]>([]);
  const [signals, setSignals]           = useState<Signal[]>([]);
  const [sprint, setSprint]             = useState<Sprint | null>(null);
  const [insights, setInsights]         = useState<AiInsight[]>([]);
  const [loading, setLoading]           = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [tick, setTick]                 = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/engine/genome").then(r => r.ok ? r.json() : null),
      fetch("/api/objectives?limit=5").then(r => r.ok ? r.json() : []),
      fetch("/api/signals?limit=8").then(r => r.ok ? r.json() : []),
      fetch("/api/sprints").then(r => r.ok ? r.json() : []),
    ]).then(([g, o, s, sp]) => {
      if (g) setGenome(g);
      setObjectives(Array.isArray(o) ? o : []);
      setSignals(Array.isArray(s) ? s : []);
      setSprint(Array.isArray(sp) && sp.length > 0 ? sp[0] : null);
      setLoading(false);
    }).catch(() => setLoading(false));

    fetch("/api/ai/insights")
      .then(r => r.ok ? r.json() : { insights: [] })
      .then(d => { setInsights(d.insights ?? []); setInsightsLoading(false); })
      .catch(() => setInsightsLoading(false));

    const iv = setInterval(() => setTick(t => !t), 900);
    return () => clearInterval(iv);
  }, []);

  /* ── derived ── */
  const shi           = genome?.startupHealthIndex ?? 0;
  const pmfInd        = genome?.indicators.find(i => i.id === "pmf");
  const velInd        = genome?.indicators.find(i => i.id === "velocity");
  const riskInd       = genome?.indicators.find(i => i.id === "death");
  const momInd        = genome?.indicators.find(i => i.id === "momentum");
  const topObj        = objectives.filter(o => o.status !== "completed").slice(0, 3);
  const mission       = computeMission(genome, objectives);
  const phase         = computePhase(genome);
  const sprintDone    = sprint?.items.filter(i => i.done).length ?? 0;
  const sprintTotal   = sprint?.items.length ?? 0;
  const sprintPct     = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;
  const blockedCount  = objectives.filter(o => o.status === "blocked").length;

  /* ── style tokens ── */
  const LBL: React.CSSProperties = {
    fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "var(--ink-3)",
  };
  const SEC: React.CSSProperties = {
    ...LBL,
    borderBottom: "1px solid var(--border)",
    paddingBottom: "0.3rem", marginBottom: "0.75rem",
  };

  /* ── render ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── STATUS BAR ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem", height: 44, flexShrink: 0,
        fontSize: "0.7rem", fontVariantNumeric: "tabular-nums",
        gap: 0,
      }}>
        <span style={{ fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink)", marginRight: "1.75rem", fontSize: "0.82rem" }}>
          VELA<span style={{ color: "var(--accent)" }}>OS</span>
        </span>

        {!loading && genome ? (
          <>
            <Metric label="SHI"  value={String(shi)}           color={shiColor(shi)}                  size="lg" />
            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 1.25rem" }} />
            {pmfInd  && <Metric label="PMF"  value={`${pmfInd.value}%`}  color={metricColor(pmfInd.value)} />}
            {velInd  && <Metric label="VEL"  value={`${velInd.value}%`}  color={metricColor(velInd.value)} />}
            {momInd  && <Metric label="MOM"  value={`${momInd.value}%`}  color={metricColor(momInd.value)} />}
            {riskInd && <Metric label="RISK" value={`${riskInd.value}%`} color={metricColor(riskInd.value, true)} />}
            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 1.25rem" }} />
            <span style={LBL}>PHASE&nbsp;</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.08em", color: "var(--accent)" }}>{phase}</span>
          </>
        ) : (
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "var(--ink-3)" }}>CALIBRATING GENOME...</span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {blockedCount > 0 && (
            <Link href="/build" style={{
              textDecoration: "none", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em",
              color: "var(--red)", display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--red)", display: "inline-block", boxShadow: "0 0 4px var(--red)" }} />
              {blockedCount} BLOQUEADO{blockedCount > 1 ? "S" : ""}
            </Link>
          )}
          <span style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-3)" }}>
            {session.name.split(" ")[0].toUpperCase()}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", display: "inline-block",
              background: "var(--green)",
              boxShadow: tick ? "0 0 0 3px color-mix(in srgb, var(--green) 25%, transparent)" : "none",
              transition: "box-shadow 0.45s ease",
            }} />
            <span style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--green)" }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* ── MISSION STRIP ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "0.625rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)", flexShrink: 0,
      }}>
        <span style={{ ...LBL, whiteSpace: "nowrap", color: "var(--accent)" }}>MISIÓN</span>
        <div style={{ width: 1, height: 14, background: "var(--border)" }} />
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.4 }}>
          {loading ? "\u2014" : mission}
        </span>
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 290px" }}>

        {/* LEFT: Priorities + Vitals + Sprint */}
        <div style={{
          borderRight: "1px solid var(--border)",
          padding: "1.25rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "1.75rem",
          overflowY: "auto",
        }}>

          {/* ACTIVE PRIORITIES */}
          <section>
            <div style={SEC}>ACTIVE PRIORITIES</div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ height: 34, background: "var(--surface)", borderRadius: "0.2rem", opacity: 0.4 }} />
                ))}
              </div>
            ) : topObj.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Sin objetivos activos</span>
                <Link href="/build" className="btn-primary" style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem" }}>+ Objetivo</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {topObj.map((obj, idx) => {
                  const color    = STATUS_STYLE[obj.status]?.color ?? "var(--ink-3)";
                  const label    = STATUS_STYLE[obj.status]?.label ?? "";
                  const daysLeft = obj.dueDate
                    ? Math.ceil((new Date(obj.dueDate).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <div key={obj.id} style={{
                      display: "grid",
                      gridTemplateColumns: "22px 8px 1fr auto auto",
                      gap: "0.6rem", alignItems: "center",
                      padding: "0.55rem 0",
                      borderBottom: idx < topObj.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.845rem", fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {obj.title}
                      </span>
                      <span style={{ fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.08em", color, whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                      {daysLeft !== null && (
                        <span style={{
                          fontSize: "0.62rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                          color: daysLeft < 0 ? "var(--red)" : daysLeft <= 3 ? "var(--amber)" : "var(--ink-3)",
                        }}>
                          {daysLeft < 0 ? `\u2212${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div style={{ paddingTop: "0.5rem" }}>
                  <Link href="/build" style={{ fontSize: "0.66rem", color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>
                    Ver todos \u2192
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* GENOME VITALS */}
          {!loading && genome && (
            <section>
              <div style={SEC}>GENOME VITALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                {genome.indicators.map((ind, idx) => {
                  const color  = metricColor(ind.value, ind.inverse);
                  const barPct = ind.inverse ? 100 - ind.value : ind.value;
                  const isOdd  = idx % 2 === 1;
                  const isLast = idx >= genome.indicators.length - 2;
                  return (
                    <div key={ind.id} style={{
                      padding: "0.55rem 0.75rem",
                      borderBottom: isLast ? "none" : "1px solid var(--border)",
                      borderLeft: isOdd ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                          {ind.label}
                        </span>
                        <span style={{ fontSize: "1.05rem", fontWeight: 900, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                          {ind.value}<span style={{ fontSize: "0.52rem" }}>%</span>
                        </span>
                      </div>
                      <div style={{ height: 2, background: "var(--surface-2)" }}>
                        <div style={{ height: "100%", width: `${barPct}%`, background: color, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ paddingTop: "0.4rem" }}>
                <Link href="/engine" style={{ fontSize: "0.66rem", color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>
                  Genome Engine \u2192
                </Link>
              </div>
            </section>
          )}

          {/* WEEKLY SPRINT */}
          <section>
            <div style={SEC}>WEEKLY SPRINT</div>
            {loading ? (
              <div style={{ height: 56, background: "var(--surface)", borderRadius: "0.2rem", opacity: 0.4 }} />
            ) : !sprint ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Sin sprint activo esta semana</span>
                <Link href="/engine" className="btn-primary" style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem" }}>Planear \u2192</Link>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.45rem" }}>
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--ink)" }}>{sprint.title}</span>
                  <span style={{
                    fontSize: "1.1rem", fontWeight: 900, fontVariantNumeric: "tabular-nums",
                    color: sprintPct >= 80 ? "var(--green)" : sprintPct >= 50 ? "var(--amber)" : "var(--ink-2)",
                  }}>
                    {sprintPct}%
                  </span>
                </div>
                <div style={{ height: 2, background: "var(--surface-2)", marginBottom: "0.75rem" }}>
                  <div style={{ height: "100%", width: `${sprintPct}%`, background: sprintPct >= 80 ? "var(--green)" : "var(--accent)", transition: "width 0.6s ease" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.28rem" }}>
                  {sprint.items.slice(0, 5).map(item => (
                    <div key={item.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: item.done ? "var(--green)" : "var(--border)" }}>
                        {item.done ? "\u25cf" : "\u25cb"}
                      </span>
                      <span style={{
                        fontSize: "0.78rem", color: item.done ? "var(--ink-3)" : "var(--ink-2)",
                        textDecoration: item.done ? "line-through" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                  {sprint.items.length > 5 && (
                    <span style={{ fontSize: "0.64rem", color: "var(--ink-3)", paddingTop: "0.1rem" }}>
                      +{sprint.items.length - 5} m\u00e1s
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: Signal Feed + AI + Launch */}
        <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* SIGNAL FEED */}
          <div style={{ borderBottom: "1px solid var(--border)", padding: "1rem 1.25rem" }}>
            <div style={SEC}>SIGNAL FEED</div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 26, background: "var(--surface)", borderRadius: "0.2rem", opacity: 0.4 }} />)}
              </div>
            ) : signals.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>
                Sin se\u00f1ales \u2014{" "}
                <Link href="/validate" style={{ color: "var(--accent)", textDecoration: "none" }}>registrar \u2192</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {signals.slice(0, 7).map((sig, idx) => (
                  <div key={sig.id} style={{
                    display: "grid", gridTemplateColumns: "14px 1fr 26px",
                    gap: "0.4rem", alignItems: "center",
                    padding: "0.38rem 0",
                    borderBottom: idx < Math.min(signals.length, 7) - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--ink-2)" }}>{SIGNAL_ICON[sig.type] ?? "\u25c8"}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sig.title}
                    </span>
                    <span style={{ fontSize: "0.56rem", color: "var(--ink-3)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {timeAgo(sig.createdAt)}
                    </span>
                  </div>
                ))}
                <div style={{ paddingTop: "0.4rem" }}>
                  <Link href="/validate" style={{ fontSize: "0.64rem", color: "var(--ink-3)", textDecoration: "none" }}>
                    Ver todas \u2192
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* FOUNDER INTELLIGENCE */}
          <div style={{ borderBottom: "1px solid var(--border)", padding: "1rem 1.25rem" }}>
            <div style={SEC}>FOUNDER INTELLIGENCE</div>
            {insightsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ height: 44, background: "var(--surface)", borderRadius: "0.2rem", opacity: 0.4 }} />)}
              </div>
            ) : insights.length === 0 ? (
              <p style={{ fontSize: "0.74rem", color: "var(--ink-3)", lineHeight: 1.6, margin: 0 }}>
                A\u00f1ade objetivos y se\u00f1ales para activar inteligencia estrat\u00e9gica.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {insights.slice(0, 3).map((ins, i) => {
                  const color = INSIGHT_COLOR[ins.type] ?? "var(--blue)";
                  const icon  = INSIGHT_ICON[ins.type] ?? "\u2192";
                  return (
                    <div key={i} style={{
                      display: "flex", gap: "0.5rem", alignItems: "flex-start",
                      padding: "0.45rem 0",
                      borderBottom: i < 2 ? "1px solid var(--border)" : "none",
                    }}>
                      <span style={{ fontSize: "0.68rem", color, marginTop: 1, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-2)", marginBottom: "0.15rem" }}>{ins.title}</div>
                        <div style={{ fontSize: "0.66rem", color: "var(--ink-3)", lineHeight: 1.5 }}>{ins.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LAUNCH PAD */}
          <div style={{ padding: "1rem 1.25rem", flex: 1 }}>
            <div style={SEC}>LAUNCH</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
              {[
                { label: "Build",    href: "/build",    desc: "Objetivos" },
                { label: "Validate", href: "/validate", desc: "Se\u00f1ales"   },
                { label: "Capital",  href: "/capital",  desc: "Gates"     },
                { label: "Relay",    href: "/relay",    desc: "Equipo"    },
                { label: "Engine",   href: "/engine",   desc: "Genome"    },
                { label: "Network",  href: "/network",  desc: "Red"       },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{
                  display: "block", padding: "0.5rem 0.6rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.25rem",
                  textDecoration: "none",
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ink-2)", letterSpacing: "0.03em" }}>{item.label}</div>
                  <div style={{ fontSize: "0.58rem", color: "var(--ink-3)", marginTop: "0.1rem" }}>{item.desc}</div>
                </Link>
              ))}
            </div>
            {session.role === "admin" && (
              <div style={{ marginTop: "0.75rem" }}>
                <Link href="/admin/content" style={{ fontSize: "0.63rem", color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>
                  Admin \u2192
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── inline sub-component ─────────────────────────────────────────────── */
function Metric({ label, value, color, size }: { label: string; value: string; color: string; size?: "lg" }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.28rem", marginRight: "1rem" }}>
      <span style={{
        fontSize: size === "lg" ? "1.2rem" : "0.9rem",
        fontWeight: 900, color, fontVariantNumeric: "tabular-nums", lineHeight: 1,
      }}>
        {value}
      </span>
      <span style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        {label}
      </span>
    </div>
  );
}
