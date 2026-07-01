"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ── types ──────────────────────────────────────────────────────────────── */
type StartupCard = {
  id: string; name: string; sector: string;
  stage: "SEARCHING" | "VALIDATING" | "BUILDING" | "SCALING";
  shi: number; pmf: number; velocity: number; momentum: number;
  risk: number; investmentReadiness: number;
  revenue?: string; runway?: string; raise?: string;
  description: string; signals: number;
  trend: "up" | "down" | "flat"; change: number;
};
type MarketIndex = {
  id: string; name: string; count: number; avgSHI: number;
  change: number; trend: "up" | "down" | "flat";
};
type ExchangeData = {
  startups: StartupCard[]; indexes: MarketIndex[]; lastUpdated: string;
};

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

const STAGES = ["ALL", "SEARCHING", "VALIDATING", "BUILDING", "SCALING"];

/* ── component ───────────────────────────────────────────────────────────── */
export default function ExchangeBoard() {
  const [data,     setData]     = useState<ExchangeData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<StartupCard | null>(null);
  const [filter,   setFilter]   = useState("ALL");
  const [tick,     setTick]     = useState(false);
  const [sort,     setSort]     = useState<"shi" | "pmf" | "velocity" | "momentum">("shi");

  useEffect(() => {
    fetch("/api/softbox/market")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    const iv = setInterval(() => setTick(t => !t), 900);
    return () => clearInterval(iv);
  }, []);

  const allStages = STAGES.slice(1);
  const filtered = (data?.startups ?? [])
    .filter(s => filter === "ALL" || s.stage === filter || s.sector.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => b[sort] - a[sort]);

  const HDR: React.CSSProperties = {
    fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "var(--ink-3)",
    borderBottom: "1px solid var(--border)", paddingBottom: "0.3rem", marginBottom: "0.75rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── EXCHANGE HEADER ─────────────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 1.5rem", gap: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        <Link href="/softbox" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.35rem", marginRight: "1.5rem" }}>
          <span style={{ fontSize: "0.56rem", color: "var(--ink-3)", letterSpacing: "0.08em" }}>← SOFTBOX</span>
        </Link>
        <div style={{ width: 1, height: 22, background: "var(--border)", marginRight: "1.25rem", flexShrink: 0 }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.14em", color: "var(--ink)", marginRight: "1.5rem" }}>
          EXCHANGE
        </span>
        <div style={{ width: 1, height: 22, background: "var(--border)", marginRight: "1.25rem", flexShrink: 0 }} />

        {/* Index tickers */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", overflow: "hidden" }}>
          {data?.indexes.map(idx => (
            <div key={idx.id} style={{ display: "flex", alignItems: "baseline", gap: "0.28rem" }}>
              <span style={{ fontSize: "0.58rem", color: "var(--ink-3)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{idx.name}</span>
              <span style={{
                fontSize: "0.68rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                color: idx.trend === "up" ? "var(--green)" : idx.trend === "down" ? "var(--red)" : "var(--ink-3)",
              }}>
                {idx.trend === "up" ? "▲" : idx.trend === "down" ? "▼" : "—"} {Math.abs(idx.change).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--green)", display: "inline-block", flexShrink: 0,
            boxShadow: tick ? "0 0 0 3px color-mix(in srgb, var(--green) 25%, transparent)" : "none",
            transition: "box-shadow 0.45s ease",
          }} />
          <span style={{ fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--green)" }}>LIVE</span>
        </div>
      </div>

      {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: selected ? "220px 1fr 308px" : "220px 1fr",
        overflow: "hidden", transition: "grid-template-columns 200ms ease",
      }}>

        {/* LEFT: Indexes + Filters */}
        <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto", padding: "1rem" }}>
          <div style={HDR}>MARKET INDEXES</div>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ height: 48, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4, marginBottom: "0.4rem" }} />
            ))
          ) : (
            data?.indexes.map(idx => {
              const tColor = idx.trend === "up" ? "var(--green)" : idx.trend === "down" ? "var(--red)" : "var(--ink-3)";
              return (
                <div
                  key={idx.id}
                  onClick={() => setFilter(filter === idx.id ? "ALL" : idx.id)}
                  style={{
                    padding: "0.6rem 0.5rem",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: filter === idx.id ? "var(--surface-2)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--ink-2)" }}>{idx.name}</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: tColor }}>
                      {idx.trend === "up" ? "+" : idx.trend === "down" ? "\u2212" : ""}{Math.abs(idx.change).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.2rem" }}>
                    <span style={{ fontSize: "0.56rem", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{idx.count} entities</span>
                    <span style={{ fontSize: "0.56rem", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>SHI\u00a0{idx.avgSHI}</span>
                  </div>
                </div>
              );
            })
          )}

          <div style={{ marginTop: "1.25rem" }}>
            <div style={HDR}>FILTER BY STAGE</div>
            {STAGES.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  display: "block", width: "100%",
                  padding: "0.35rem 0.5rem", marginBottom: "0.2rem",
                  background: filter === f ? "var(--surface-2)" : "transparent",
                  border: filter === f ? "1px solid var(--border-mid)" : "1px solid transparent",
                  borderRadius: "0.2rem", cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.66rem",
                  fontWeight: filter === f ? 700 : 500,
                  color: filter === f
                    ? (f === "ALL" ? "var(--ink)" : (STAGE_COLOR[f] ?? "var(--ink)"))
                    : "var(--ink-3)",
                  letterSpacing: "0.06em",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <div style={HDR}>SORT BY</div>
            {(["shi", "pmf", "velocity", "momentum"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  display: "block", width: "100%",
                  padding: "0.35rem 0.5rem", marginBottom: "0.2rem",
                  background: sort === s ? "var(--surface-2)" : "transparent",
                  border: sort === s ? "1px solid var(--border-mid)" : "1px solid transparent",
                  borderRadius: "0.2rem", cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.66rem", fontWeight: sort === s ? 700 : 500,
                  color: sort === s ? "var(--ink)" : "var(--ink-3)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Startup Cards */}
        <div style={{ overflowY: "auto", padding: "1rem" }}>
          <div style={{
            fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em",
            color: "var(--ink-3)", textTransform: "uppercase",
            borderBottom: "1px solid var(--border)", paddingBottom: "0.3rem", marginBottom: "0.75rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>STARTUP INTELLIGENCE — {filtered.length} ENTITIES</span>
            {data?.lastUpdated && (
              <span style={{ fontWeight: 400 }}>
                Updated {new Date(data.lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.6rem" }}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} style={{ height: 140, background: "var(--surface)", borderRadius: "0.15rem", opacity: 0.4 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: "0.82rem", color: "var(--ink-3)", padding: "2rem 0" }}>
              No startups match this filter.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.6rem" }}>
              {filtered.map(s => (
                <Card
                  key={s.id}
                  startup={s}
                  active={selected?.id === s.id}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Detail Panel */}
        {selected && (
          <div style={{ borderLeft: "1px solid var(--border)", overflowY: "auto", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  {selected.sector}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>{selected.name}</div>
                <div style={{
                  display: "inline-block", marginTop: "0.3rem",
                  fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em",
                  color: STAGE_COLOR[selected.stage],
                  padding: "0.15rem 0.4rem",
                  background: `color-mix(in srgb, ${STAGE_COLOR[selected.stage]} 12%, transparent)`,
                  borderRadius: "0.15rem",
                }}>
                  {selected.stage}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: "1.1rem", padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: "0.72rem", color: "var(--ink-2)", lineHeight: 1.65, marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
              {selected.description}
            </p>

            {/* Metrics */}
            <div style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              KEY METRICS
            </div>
            {[
              { l: "Startup Health",      v: String(selected.shi),                   c: mc(selected.shi)               },
              { l: "PMF Probability",     v: `${selected.pmf}%`,                     c: mc(selected.pmf)               },
              { l: "Execution Velocity",  v: `${selected.velocity}%`,               c: mc(selected.velocity)          },
              { l: "Growth Momentum",     v: `${selected.momentum}%`,               c: mc(selected.momentum)          },
              { l: "Risk Exposure",       v: `${selected.risk}%`,                   c: mc(selected.risk, true)        },
              { l: "Investment Readiness",v: `${selected.investmentReadiness}%`,    c: mc(selected.investmentReadiness)},
            ].map(({ l, v, c }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.42rem 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--ink-3)" }}>{l}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </div>
            ))}

            {/* Capital */}
            {(selected.revenue || selected.runway || selected.raise) && (
              <>
                <div style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.16em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "0.6rem", marginTop: "1rem" }}>
                  CAPITAL INTELLIGENCE
                </div>
                {selected.revenue && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.42rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--ink-3)" }}>Revenue</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{selected.revenue}</span>
                  </div>
                )}
                {selected.runway && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.42rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--ink-3)" }}>Runway</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--blue)", fontVariantNumeric: "tabular-nums" }}>{selected.runway}</span>
                  </div>
                )}
                {selected.raise && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.42rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--ink-3)" }}>Raising</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--amber)", fontVariantNumeric: "tabular-nums" }}>{selected.raise}</span>
                  </div>
                )}
              </>
            )}

            {/* Signals badge */}
            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.4rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.62rem", color: "var(--ink-3)" }}>{selected.signals} validated signals</span>
              <span style={{
                fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.08em",
                color: selected.trend === "up" ? "var(--green)" : selected.trend === "down" ? "var(--red)" : "var(--ink-3)",
              }}>
                {selected.trend === "up" ? `▲ +${selected.change.toFixed(1)}%` : selected.trend === "down" ? `▼ \u2212${selected.change.toFixed(1)}%` : "\u2014 FLAT"}
              </span>
            </div>

            <Link href="/softbox/investors" style={{
              display: "block", textAlign: "center", marginTop: "0.875rem",
              padding: "0.6rem", border: "1px solid var(--border-mid)",
              borderRadius: "0.2rem", textDecoration: "none",
              fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-2)",
            }}>
              Investor View →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Startup Card ─────────────────────────────────────────────────────────── */
function Card({ startup, active, onClick }: { startup: StartupCard; active: boolean; onClick: () => void }) {
  const sc = STAGE_COLOR[startup.stage] ?? "var(--ink-3)";
  const tc = startup.trend === "up" ? "var(--green)" : startup.trend === "down" ? "var(--red)" : "var(--ink-3)";
  return (
    <div
      onClick={onClick}
      style={{
        padding: "0.875rem",
        border: active ? "1px solid var(--border-mid)" : "1px solid var(--border)",
        background: active ? "var(--surface-2)" : "var(--surface)",
        borderRadius: "0.2rem",
        cursor: "pointer",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "0.15rem" }}>
            {startup.sector}
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {startup.name}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "0.5rem" }}>
          <div style={{ fontSize: "0.5rem", fontWeight: 700, color: sc, letterSpacing: "0.08em" }}>{startup.stage}</div>
          <div style={{ fontSize: "0.66rem", fontWeight: 700, color: tc, fontVariantNumeric: "tabular-nums" }}>
            {startup.trend === "up" ? "▲" : startup.trend === "down" ? "▼" : "—"} {Math.abs(startup.change).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.3rem", marginBottom: "0.6rem" }}>
        {[
          { l: "SHI", v: String(startup.shi),       c: mc(startup.shi)      },
          { l: "PMF", v: `${startup.pmf}%`,         c: mc(startup.pmf)      },
          { l: "VEL", v: `${startup.velocity}%`,    c: mc(startup.velocity) },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: "0.47rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginTop: "0.12rem" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Health bar */}
      <div style={{ height: 2, background: "var(--surface-3)", marginBottom: "0.5rem" }}>
        <div style={{ height: "100%", width: `${startup.shi}%`, background: mc(startup.shi), transition: "width 0.6s ease" }} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {startup.revenue && <span style={{ fontSize: "0.58rem", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{startup.revenue}</span>}
          {startup.runway  && <span style={{ fontSize: "0.58rem", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>↔ {startup.runway}</span>}
        </div>
        {startup.raise && (
          <span style={{ fontSize: "0.54rem", fontWeight: 700, color: "var(--amber)", letterSpacing: "0.04em" }}>
            ◉ {startup.raise}
          </span>
        )}
      </div>
    </div>
  );
}
