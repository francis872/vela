"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ── types ──────────────────────────────────────────────────────────────── */
type Session = { name: string };
type StartupCard = {
  id: string; name: string; sector: string;
  stage: "SEARCHING" | "VALIDATING" | "BUILDING" | "SCALING";
  shi: number; pmf: number; velocity: number; momentum: number;
  risk: number; investmentReadiness: number;
  revenue?: string; runway?: string; raise?: string;
  description: string; signals: number;
  trend: "up" | "down" | "flat"; change: number;
};
type MarketIndex = { id: string; name: string; count: number; avgSHI: number; change: number; trend: "up" | "down" | "flat" };
type ExchangeData = { startups: StartupCard[]; indexes: MarketIndex[]; lastUpdated: string };
type AiInsight    = { type: string; title: string; body: string };

/* ── helpers ─────────────────────────────────────────────────────────────── */
function mc(v: number, inv = false) {
  const e = inv ? 100 - v : v;
  if (e >= 70) return "var(--green)";
  if (e >= 45) return "var(--blue)";
  if (e >= 30) return "var(--amber)";
  return "var(--red)";
}

const STAGE_COLOR: Record<string, string> = {
  SEARCHING: "var(--ink-3)", VALIDATING: "var(--amber)",
  BUILDING:  "var(--blue)",  SCALING:    "var(--green)",
};

const INSIGHT_CFG: Record<string, { color: string; icon: string }> = {
  warning:  { color: "var(--amber)", icon: "⚠" },
  positive: { color: "var(--green)", icon: "✓" },
  action:   { color: "var(--blue)",  icon: "→" },
};

/* ── component ───────────────────────────────────────────────────────────── */
export default function InvestorSpace({ session }: { session: Session }) {
  const [data,     setData]     = useState<ExchangeData | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tick,     setTick]     = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<StartupCard | null>(null);

  useEffect(() => {
    fetch("/api/softbox/market")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/ai/insights")
      .then(r => r.ok ? r.json() : { insights: [] })
      .then(d => setInsights(d.insights ?? []))
      .catch(() => {});

    const iv = setInterval(() => setTick(t => !t), 900);
    return () => clearInterval(iv);
  }, []);

  /* Derived */
  const stages = ["SEARCHING", "VALIDATING", "BUILDING", "SCALING"] as const;
  const stageCounts = stages.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (data?.startups ?? []).filter(x => x.stage === s).length;
    return acc;
  }, {});

  const watchlist = (data?.startups ?? [])
    .filter(s => stageFilter === "ALL" || s.stage === stageFilter)
    .sort((a, b) => b.investmentReadiness - a.investmentReadiness);

  /* Sector analysis */
  const sectorMap: Record<string, { count: number; totalSHI: number; totalIR: number }> = {};
  (data?.startups ?? []).forEach(s => {
    if (!sectorMap[s.sector]) sectorMap[s.sector] = { count: 0, totalSHI: 0, totalIR: 0 };
    sectorMap[s.sector].count++;
    sectorMap[s.sector].totalSHI += s.shi;
    sectorMap[s.sector].totalIR  += s.investmentReadiness;
  });
  const sectors = Object.entries(sectorMap)
    .map(([name, d]) => ({ name, avgSHI: Math.round(d.totalSHI / d.count), avgIR: Math.round(d.totalIR / d.count) }))
    .sort((a, b) => b.avgIR - a.avgIR);

  /* Risk matrix */
  const allStartups = data?.startups ?? [];
  const highIR   = allStartups.filter(s => s.investmentReadiness >= 70).length;
  const midIR    = allStartups.filter(s => s.investmentReadiness >= 45 && s.investmentReadiness < 70).length;
  const lowIR    = allStartups.filter(s => s.investmentReadiness < 45).length;
  const avgSHI   = allStartups.length ? Math.round(allStartups.reduce((s, x) => s + x.shi, 0) / allStartups.length) : 0;

  const HDR: React.CSSProperties = {
    fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "var(--ink-3)",
    borderBottom: "1px solid var(--border)", paddingBottom: "0.3rem", marginBottom: "0.75rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── INVESTOR HEADER ─────────────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 1.5rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        <Link href="/softbox" style={{ textDecoration: "none", display: "flex", alignItems: "center", marginRight: "1.5rem" }}>
          <span style={{ fontSize: "0.56rem", color: "var(--ink-3)", letterSpacing: "0.08em" }}>← SOFTBOX</span>
        </Link>
        <div style={{ width: 1, height: 22, background: "var(--border)", marginRight: "1.25rem", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginRight: "1.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.14em", color: "var(--ink)" }}>INVESTOR SPACE</span>
          <span style={{ fontSize: "0.5rem", color: "var(--ink-3)", letterSpacing: "0.08em" }}>INSTITUTIONAL PORTFOLIO INTELLIGENCE</span>
        </div>
        <div style={{ width: 1, height: 22, background: "var(--border)", marginRight: "1.25rem", flexShrink: 0 }} />

        {!loading && (
          <div style={{ display: "flex", alignItems: "baseline", gap: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "var(--blue)", fontVariantNumeric: "tabular-nums" }}>{allStartups.length}</span>
              <span style={{ fontSize: "0.48rem", color: "var(--ink-3)", letterSpacing: "0.1em" }}>ENTITIES</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: mc(avgSHI), fontVariantNumeric: "tabular-nums" }}>{avgSHI}</span>
              <span style={{ fontSize: "0.48rem", color: "var(--ink-3)", letterSpacing: "0.1em" }}>AVG SHI</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{highIR}</span>
              <span style={{ fontSize: "0.48rem", color: "var(--ink-3)", letterSpacing: "0.1em" }}>HIGH IR</span>
            </div>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block", flexShrink: 0,
            boxShadow: tick ? "0 0 0 3px color-mix(in srgb, var(--green) 25%, transparent)" : "none",
            transition: "box-shadow 0.45s ease",
          }} />
          <span style={{ fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--green)" }}>LIVE</span>
        </div>
      </div>

      {/* ── THREE-COLUMN GRID ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 272px", overflow: "hidden" }}>

        {/* LEFT: Pipeline overview */}
        <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto", padding: "1rem" }}>
          <div style={HDR}>INVESTMENT PIPELINE</div>

          {stages.map(s => {
            const count = stageCounts[s] ?? 0;
            const sc    = STAGE_COLOR[s];
            const pct   = allStartups.length > 0 ? Math.round((count / allStartups.length) * 100) : 0;
            return (
              <div
                key={s}
                onClick={() => setStageFilter(stageFilter === s ? "ALL" : s)}
                style={{
                  padding: "0.6rem 0.5rem",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: stageFilter === s ? "var(--surface-2)" : "transparent",
                  borderRadius: stageFilter === s ? "0.15rem" : 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: sc, letterSpacing: "0.08em" }}>{s}</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 900, color: sc, fontVariantNumeric: "tabular-nums" }}>{count}</span>
                </div>
                <div style={{ height: 2, background: "var(--surface-3)" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: sc }} />
                </div>
                <div style={{ fontSize: "0.54rem", color: "var(--ink-3)", marginTop: "0.2rem", fontVariantNumeric: "tabular-nums" }}>
                  {pct}% of deal flow
                </div>
              </div>
            );
          })}

          {/* Quick stats */}
          <div style={{ marginTop: "1.25rem" }}>
            <div style={HDR}>PIPELINE SUMMARY</div>
            {[
              { l: "High IR (≥70)",   v: String(highIR),   c: "var(--green)" },
              { l: "Mid IR (45–69)",  v: String(midIR),    c: "var(--blue)"  },
              { l: "Low IR (<45)",    v: String(lowIR),    c: "var(--red)"   },
              { l: "Avg Portfolio SHI", v: String(avgSHI), c: mc(avgSHI)     },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.42rem 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.63rem", color: "var(--ink-3)" }}>{l}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <Link href="/softbox/exchange" style={{
              display: "block", textAlign: "center",
              padding: "0.5rem", border: "1px solid var(--border)",
              borderRadius: "0.2rem", textDecoration: "none",
              fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.07em", color: "var(--ink-3)",
            }}>
              Open Exchange →
            </Link>
          </div>
        </div>

        {/* CENTER: Watchlist */}
        <div style={{ overflowY: "auto", padding: "1rem" }}>
          <div style={{
            fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em",
            color: "var(--ink-3)", textTransform: "uppercase",
            borderBottom: "1px solid var(--border)", paddingBottom: "0.3rem", marginBottom: "0.75rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>PORTFOLIO WATCHLIST — {watchlist.length} ENTITIES</span>
            <span style={{ fontWeight: 400 }}>sorted by investment readiness</span>
          </div>

          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ height: 80, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4, marginBottom: "0.4rem" }} />
            ))
          ) : watchlist.length === 0 ? (
            <div style={{ fontSize: "0.82rem", color: "var(--ink-3)", padding: "2rem 0" }}>No entities in this stage.</div>
          ) : (
            watchlist.map((s, idx) => {
              const sc = STAGE_COLOR[s.stage] ?? "var(--ink-3)";
              const isActive = selected?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(isActive ? null : s)}
                  style={{
                    display: "grid", gridTemplateColumns: "28px 1fr auto",
                    gap: "0.7rem", alignItems: "start",
                    padding: "0.75rem 0.5rem",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: isActive ? "var(--surface-2)" : "transparent",
                    transition: "background 120ms ease",
                  }}
                >
                  <span style={{
                    fontSize: "0.55rem", fontWeight: 700, color: "var(--ink-3)",
                    fontVariantNumeric: "tabular-nums", paddingTop: "0.2rem",
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>{s.name}</span>
                      <span style={{ fontSize: "0.5rem", fontWeight: 700, color: sc, letterSpacing: "0.08em" }}>{s.stage}</span>
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "var(--ink-3)", marginTop: "0.12rem", fontVariantNumeric: "tabular-nums" }}>
                      {s.sector} · {s.signals} signals
                      {s.raise && ` · ◉ ${s.raise}`}
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem" }}>
                      {[
                        { l: "SHI", v: String(s.shi), c: mc(s.shi) },
                        { l: "PMF", v: `${s.pmf}%`, c: mc(s.pmf) },
                        { l: "VEL", v: `${s.velocity}%`, c: mc(s.velocity) },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                          <span style={{ fontSize: "0.46rem", color: "var(--ink-3)", letterSpacing: "0.08em" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: mc(s.investmentReadiness), fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                      {s.investmentReadiness}
                    </div>
                    <div style={{ fontSize: "0.46rem", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.12rem" }}>
                      IR SCORE
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT: Intelligence */}
        <div style={{ borderLeft: "1px solid var(--border)", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Sector analysis */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
            <div style={HDR}>SECTOR ANALYSIS</div>
            {loading ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={{ height: 36, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4, marginBottom: "0.3rem" }} />
              ))
            ) : (
              sectors.slice(0, 6).map(sec => (
                <div key={sec.name} style={{ padding: "0.45rem 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.18rem" }}>
                    <span style={{ fontSize: "0.66rem", color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{sec.name}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: mc(sec.avgIR), fontVariantNumeric: "tabular-nums" }}>IR {sec.avgIR}</span>
                  </div>
                  <div style={{ height: 2, background: "var(--surface-2)" }}>
                    <div style={{ height: "100%", width: `${sec.avgIR}%`, background: mc(sec.avgIR) }} />
                  </div>
                  <div style={{ fontSize: "0.54rem", color: "var(--ink-3)", marginTop: "0.15rem", fontVariantNumeric: "tabular-nums" }}>
                    Avg SHI {sec.avgSHI}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* AI Investment Intelligence */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
            <div style={HDR}>AI INVESTMENT INTELLIGENCE</div>
            {insights.length === 0 ? (
              <p style={{ fontSize: "0.68rem", color: "var(--ink-3)", lineHeight: 1.6, margin: 0 }}>
                Strategic insights will appear as operational signals accumulate across the portfolio.
              </p>
            ) : (
              insights.slice(0, 3).map((ins, i) => {
                const cfg = INSIGHT_CFG[ins.type] ?? { color: "var(--blue)", icon: "→" };
                return (
                  <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", padding: "0.45rem 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                    <span style={{ fontSize: "0.65rem", color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--ink-2)", marginBottom: "0.12rem" }}>{ins.title}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--ink-3)", lineHeight: 1.55 }}>{ins.body}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Risk Matrix */}
          <div style={{ padding: "1rem" }}>
            <div style={HDR}>RISK MATRIX</div>
            {[
              { label: "High Risk",    count: allStartups.filter(s => s.risk >= 60).length, color: "var(--red)"   },
              { label: "Medium Risk",  count: allStartups.filter(s => s.risk >= 35 && s.risk < 60).length, color: "var(--amber)" },
              { label: "Low Risk",     count: allStartups.filter(s => s.risk < 35).length, color: "var(--green)"  },
              { label: "Scaling",      count: stageCounts["SCALING"] ?? 0,    color: "var(--green)"  },
              { label: "Ready to Raise", count: allStartups.filter(s => s.investmentReadiness >= 65 && s.raise).length, color: "var(--blue)" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.42rem 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.63rem", color: "var(--ink-3)" }}>{label}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
