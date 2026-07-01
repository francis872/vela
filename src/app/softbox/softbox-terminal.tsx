"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ── types ──────────────────────────────────────────────────────────────── */
type Session = { name: string; role: string };
type Genome = {
  startupHealthIndex: number;
  indicators: { id: string; label: string; value: number; insight: string; inverse?: boolean }[];
};
type Objective = { id: string; title: string; status: string; dueDate?: string };
type Signal    = { id: string; type: string; title: string; createdAt: string };
type Sprint    = { id: string; title: string; items: { id: string; title: string; done: boolean }[] };
type AiInsight = { type: string; title: string; body: string };

/* ── constants ───────────────────────────────────────────────────────────── */
const SIG_ICON: Record<string, string> = {
  experiment: "⚗", interview: "◈", metric: "▲", insight: "◆",
};
const INSIGHT_CFG: Record<string, { color: string; icon: string }> = {
  warning:  { color: "var(--amber)", icon: "⚠" },
  positive: { color: "var(--green)", icon: "✓" },
  action:   { color: "var(--blue)",  icon: "→" },
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
function mc(v: number, inv = false) {
  const e = inv ? 100 - v : v;
  if (e >= 70) return "var(--green)";
  if (e >= 45) return "var(--blue)";
  if (e >= 30) return "var(--amber)";
  return "var(--red)";
}
function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ── component ───────────────────────────────────────────────────────────── */
export default function SoftboxTerminal({ session }: { session: Session }) {
  const [genome,     setGenome]     = useState<Genome | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [signals,    setSignals]    = useState<Signal[]>([]);
  const [sprint,     setSprint]     = useState<Sprint | null>(null);
  const [insights,   setInsights]   = useState<AiInsight[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tick,       setTick]       = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/engine/genome").then(r => r.ok ? r.json() : null),
      fetch("/api/objectives?limit=5").then(r => r.ok ? r.json() : []),
      fetch("/api/signals?limit=10").then(r => r.ok ? r.json() : []),
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
      .then(d => setInsights(d.insights ?? []))
      .catch(() => {});

    const iv = setInterval(() => setTick(t => !t), 900);
    return () => clearInterval(iv);
  }, []);

  /* derived */
  const shi   = genome?.startupHealthIndex ?? 0;
  const pmf   = genome?.indicators.find(i => i.id === "pmf")?.value ?? 0;
  const vel   = genome?.indicators.find(i => i.id === "velocity")?.value ?? 0;
  const risk  = genome?.indicators.find(i => i.id === "death")?.value ?? 0;
  const mom   = genome?.indicators.find(i => i.id === "momentum")?.value ?? 0;
  const inv   = genome?.indicators.find(i => i.id === "investment_readiness")?.value ?? 0;

  const done  = sprint?.items.filter(i => i.done).length ?? 0;
  const total = sprint?.items.length ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const phase = pmf >= 65 && vel >= 65 ? "SCALING"
              : pmf >= 50              ? "BUILDING"
              : pmf >= 30              ? "VALIDATING"
              :                          "SEARCHING";
  const phaseColor: Record<string, string> = {
    SCALING: "var(--green)", BUILDING: "var(--blue)",
    VALIDATING: "var(--amber)", SEARCHING: "var(--ink-3)",
  };

  /* style token */
  const HDR: React.CSSProperties = {
    fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "var(--ink-3)",
    borderBottom: "1px solid var(--border)", paddingBottom: "0.3rem", marginBottom: "0.75rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 1.5rem", gap: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        {/* Logotype */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "1.5rem" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.14em", color: "var(--ink)" }}>
            SOFT<span style={{ color: "var(--accent)" }}>BOX</span>
          </span>
          <span style={{ fontSize: "0.5rem", color: "var(--ink-3)", letterSpacing: "0.1em", marginLeft: "0.2rem" }}>
            INSTITUTIONAL TERMINAL
          </span>
        </div>

        <div style={{ width: 1, height: 22, background: "var(--border)", marginRight: "1.5rem", flexShrink: 0 }} />

        {/* Live metrics */}
        {!loading && genome && (
          <>
            {[
              { l: "SHI",  v: String(shi),  c: mc(shi),       big: true },
              { l: "PMF",  v: `${pmf}%`,    c: mc(pmf)               },
              { l: "VEL",  v: `${vel}%`,    c: mc(vel)               },
              { l: "MOM",  v: `${mom}%`,    c: mc(mom)               },
              { l: "RISK", v: `${risk}%`,   c: mc(risk, true)        },
              { l: "INV",  v: `${inv}%`,    c: mc(inv)               },
            ].map(({ l, v, c, big }) => (
              <div key={l} style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginRight: "1.1rem" }}>
                <span style={{ fontSize: big ? "1rem" : "0.82rem", fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-3)", textTransform: "uppercase" }}>{l}</span>
              </div>
            ))}
            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 1.1rem", flexShrink: 0 }} />
            <span style={{ fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.1em", color: phaseColor[phase] }}>
              {phase}
            </span>
          </>
        )}
        {loading && (
          <span style={{ fontSize: "0.58rem", color: "var(--ink-3)", letterSpacing: "0.1em" }}>CALIBRATING...</span>
        )}

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/softbox/exchange" style={{ textDecoration: "none", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase" }}>
            Exchange ↗
          </Link>
          <Link href="/softbox/investors" style={{ textDecoration: "none", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase" }}>
            Investors ↗
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--green)", display: "inline-block", flexShrink: 0,
              boxShadow: tick ? "0 0 0 3px color-mix(in srgb, var(--green) 25%, transparent)" : "none",
              transition: "box-shadow 0.45s ease",
            }} />
            <span style={{ fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--green)" }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* ── THREE-COLUMN GRID ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "248px 1fr 272px", overflow: "hidden" }}>

        {/* ── LEFT: Genome Matrix ────────────────────────────────────────── */}
        <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto", padding: "1rem" }}>

          {/* SHI Score */}
          <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div style={HDR}>STARTUP HEALTH INDEX</div>
            {loading ? (
              <div style={{ height: 64, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4 }} />
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                  <span style={{
                    fontSize: "3.8rem", fontWeight: 900, lineHeight: 1,
                    color: mc(shi), fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.05em",
                  }}>
                    {shi}
                  </span>
                  <span style={{ fontSize: "1rem", color: "var(--ink-3)", fontWeight: 500 }}>/100</span>
                </div>
                <div style={{ height: 3, background: "var(--surface-2)", marginTop: "0.75rem", borderRadius: 2 }}>
                  <div style={{
                    height: "100%", width: `${shi}%`,
                    background: `linear-gradient(90deg, ${mc(shi)}, color-mix(in srgb, ${mc(shi)} 60%, transparent))`,
                    borderRadius: 2, transition: "width 0.8s ease",
                  }} />
                </div>
                <div style={{ marginTop: "0.4rem", fontSize: "0.6rem", color: "var(--ink-3)" }}>
                  {shi >= 70 ? "Strong operational health" : shi >= 50 ? "Moderate health — attention needed" : "Critical — immediate action required"}
                </div>
              </>
            )}
          </div>

          {/* Genome Matrix */}
          <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div style={HDR}>GENOME MATRIX</div>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => (
                <div key={i} style={{ height: 30, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.3, marginBottom: "0.4rem" }} />
              ))
            ) : genome?.indicators.map(ind => {
              const c   = mc(ind.value, ind.inverse);
              const bar = ind.inverse ? 100 - ind.value : ind.value;
              return (
                <div key={ind.id} style={{ marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.22rem" }}>
                    <span style={{ fontSize: "0.6rem", color: "var(--ink-2)", letterSpacing: "0.03em" }}>{ind.label}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>
                      {ind.value}<span style={{ fontSize: "0.56rem" }}>%</span>
                    </span>
                  </div>
                  <div style={{ height: 2, background: "var(--surface-2)" }}>
                    <div style={{ height: "100%", width: `${bar}%`, background: c, transition: "width 0.7s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sprint */}
          <div>
            <div style={HDR}>EXECUTION SPRINT</div>
            {loading ? (
              <div style={{ height: 48, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4 }} />
            ) : !sprint ? (
              <Link href="/engine" style={{ fontSize: "0.72rem", color: "var(--ink-3)", textDecoration: "none" }}>
                No active sprint — plan one →
              </Link>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.74rem", color: "var(--ink-2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{sprint.title}</span>
                  <span style={{
                    fontSize: "1rem", fontWeight: 900, fontVariantNumeric: "tabular-nums",
                    color: pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--ink-2)",
                  }}>{pct}%</span>
                </div>
                <div style={{ height: 2, background: "var(--surface-2)" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "var(--green)" : "var(--accent)", transition: "width 0.6s ease" }} />
                </div>
                <div style={{ marginTop: "0.35rem", fontSize: "0.58rem", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
                  {done}/{total} tasks complete
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Mission Control ─────────────────────────────────────── */}
        <div style={{ overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Objectives */}
          <section>
            <div style={HDR}>MISSION CONTROL — ACTIVE OBJECTIVES</div>
            {loading ? (
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{ height: 32, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4, marginBottom: "0.4rem" }} />
              ))
            ) : objectives.filter(o => o.status !== "completed").length === 0 ? (
              <span style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>
                No objectives — <Link href="/build" style={{ color: "var(--accent)", textDecoration: "none" }}>create one →</Link>
              </span>
            ) : (
              objectives.filter(o => o.status !== "completed").slice(0, 5).map((obj, idx) => {
                const statusColors: Record<string, string> = {
                  on_track: "var(--green)", at_risk: "var(--amber)",
                  blocked: "var(--red)", completed: "var(--ink-3)",
                };
                const c = statusColors[obj.status] ?? "var(--ink-3)";
                const dl = obj.dueDate ? Math.ceil((new Date(obj.dueDate).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={obj.id} style={{
                    display: "grid", gridTemplateColumns: "18px 7px 1fr auto auto",
                    gap: "0.55rem", alignItems: "center",
                    padding: "0.45rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: "0.57rem", fontWeight: 700, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
                    <span style={{ fontSize: "0.82rem", color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {obj.title}
                    </span>
                    <span style={{ fontSize: "0.52rem", fontWeight: 700, color: c, letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                      {obj.status.replace("_", " ").toUpperCase()}
                    </span>
                    {dl !== null && (
                      <span style={{
                        fontSize: "0.6rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                        color: dl < 0 ? "var(--red)" : dl <= 3 ? "var(--amber)" : "var(--ink-3)",
                      }}>
                        {dl < 0 ? `\u2212${Math.abs(dl)}d` : `${dl}d`}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* Signal Feed */}
          <section>
            <div style={HDR}>MARKET SIGNAL FEED</div>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ height: 26, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4, marginBottom: "0.3rem" }} />
              ))
            ) : signals.length === 0 ? (
              <span style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>
                No signals — <Link href="/validate" style={{ color: "var(--accent)", textDecoration: "none" }}>log signal →</Link>
              </span>
            ) : (
              signals.slice(0, 8).map((sig, idx) => (
                <div key={sig.id} style={{
                  display: "grid", gridTemplateColumns: "14px 1fr 30px",
                  gap: "0.4rem", alignItems: "center",
                  padding: "0.35rem 0",
                  borderBottom: idx < 7 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--ink-2)" }}>{SIG_ICON[sig.type] ?? "◈"}</span>
                  <span style={{ fontSize: "0.74rem", color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sig.title}</span>
                  <span style={{ fontSize: "0.54rem", color: "var(--ink-3)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{ago(sig.createdAt)}</span>
                </div>
              ))
            )}
          </section>

          {/* Exchange CTA */}
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: "0.2rem",
            padding: "0.875rem 1rem",
            background: "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "0.48rem", letterSpacing: "0.16em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                SOFTBOX EXCHANGE
              </div>
              <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--ink-2)", letterSpacing: "-0.01em" }}>
                Institutional startup intelligence market
              </div>
              <div style={{ fontSize: "0.64rem", color: "var(--ink-3)", marginTop: "0.2rem" }}>
                12 startups · 4 sector indexes · live telemetry
              </div>
            </div>
            <Link href="/softbox/exchange" style={{
              textDecoration: "none", padding: "0.5rem 0.875rem",
              border: "1px solid var(--border-mid)", borderRadius: "0.2rem",
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
              color: "var(--ink-2)", whiteSpace: "nowrap",
              transition: "all 160ms ease",
            }}>
              Enter Exchange →
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Intelligence Panel ───────────────────────────────────── */}
        <div style={{ borderLeft: "1px solid var(--border)", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* AI Insights */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
            <div style={HDR}>STRATEGIC INTELLIGENCE</div>
            {insights.length === 0 ? (
              <p style={{ fontSize: "0.72rem", color: "var(--ink-3)", lineHeight: 1.65, margin: 0 }}>
                Add objectives and signals to activate AI-driven operational insights.
              </p>
            ) : (
              insights.slice(0, 4).map((ins, i) => {
                const cfg = INSIGHT_CFG[ins.type] ?? { color: "var(--blue)", icon: "→" };
                return (
                  <div key={i} style={{
                    display: "flex", gap: "0.45rem", alignItems: "flex-start",
                    padding: "0.45rem 0",
                    borderBottom: i < Math.min(insights.length, 4) - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <span style={{ fontSize: "0.65rem", color: cfg.color, marginTop: 2, flexShrink: 0 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-2)", marginBottom: "0.15rem" }}>{ins.title}</div>
                      <div style={{ fontSize: "0.63rem", color: "var(--ink-3)", lineHeight: 1.55 }}>{ins.body}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Founder identity */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
            <div style={HDR}>FOUNDER IDENTITY</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
              {session.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              <span style={{
                fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.1em",
                color: "var(--accent)", padding: "0.2rem 0.45rem",
                background: "rgba(232,92,46,0.1)", borderRadius: "0.15rem",
              }}>
                {session.role.toUpperCase()}
              </span>
              {!loading && (
                <span style={{
                  fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.1em",
                  color: phaseColor[phase],
                  padding: "0.2rem 0.45rem",
                  background: `color-mix(in srgb, ${phaseColor[phase]} 12%, transparent)`,
                  borderRadius: "0.15rem",
                }}>
                  {phase}
                </span>
              )}
            </div>
          </div>

          {/* Infrastructure links */}
          <div style={{ padding: "1rem", flex: 1 }}>
            <div style={HDR}>INFRASTRUCTURE</div>
            {[
              { label: "Command",   desc: "Operational center",    href: "/vela"     },
              { label: "Build",     desc: "Objectives & execution", href: "/build"    },
              { label: "Validate",  desc: "Signal intelligence",    href: "/validate" },
              { label: "Capital",   desc: "Investment readiness",   href: "/capital"  },
              { label: "Engine",    desc: "Genome & analytics",     href: "/engine"   },
              { label: "Exchange",  desc: "Venture market",         href: "/softbox/exchange"  },
              { label: "Investors", desc: "Investor environment",   href: "/softbox/investors" },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.42rem 0", textDecoration: "none",
                borderBottom: "1px solid var(--border)",
              }}>
                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--ink-2)" }}>{item.label}</div>
                  <div style={{ fontSize: "0.58rem", color: "var(--ink-3)" }}>{item.desc}</div>
                </div>
                <span style={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
