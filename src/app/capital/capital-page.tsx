"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import type { CapitalReadinessResponse } from "@/lib/functional-contracts";
import ValuationLab from "./valuation-lab";
import InvestorIntelligenceLab from "./investor-intelligence-lab";
import CapitalDigitalTwin from "./capital-digital-twin";
import ScenarioOptimizer from "./scenario-optimizer";
import FundraisingIntelligence from "./fundraising-intelligence";

type Session = { name: string; email: string; role: string };

type CapitalIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  action: { label: string; href: string };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  focus: string;
  evidence: string[];
};

type Gate = {
  id: string;
  name: string;
  stage: string;
  criteria: string;
  status: "pending" | "passed" | "failed";
  decidedAt?: string | null;
  ownerName: string;
  createdAt: string;
};

const STAGE_ORDER = ["Discovery", "Validation", "Traction", "Scale", "Series A"];

const GATE_BADGE: Record<string, string> = {
  pending: "badge-ghost",
  passed:  "badge-green",
  failed:  "badge-red",
};

const GATE_LABEL: Record<string, string> = {
  pending: "Pendiente",
  passed:  "Superado",
  failed:  "Fallido",
};

export default function CapitalPage({ session }: { session: Session }) {
  const [gates, setGates] = useState<Gate[]>([]);
  const [readinessData, setReadinessData] = useState<CapitalReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intelligence, setIntelligence] = useState<CapitalIntelligence | null>(null);

  const [form, setForm] = useState({ name: "", stage: "Discovery", criteria: "" });

  async function load() {
    const [gatesRes, readinessRes, intelligenceRes] = await Promise.all([
      fetch("/api/gates?limit=30", { cache: "no-store" }),
      fetch("/api/capital/readiness", { cache: "no-store" }),
      fetch("/api/capital/intelligence", { cache: "no-store" }),
    ]);
    if (gatesRes.ok) setGates(await gatesRes.json());
    if (readinessRes.ok) setReadinessData((await readinessRes.json()) as CapitalReadinessResponse);
    if (intelligenceRes.ok) {
      const payload = await intelligenceRes.json();
      setIntelligence(payload.intelligence ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { void load().catch(() => setLoading(false)); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stream = new EventSource("/api/home/events");
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 250);
    };
    stream.addEventListener("domain-event", refresh);
    return () => { if (timer) clearTimeout(timer); stream.close(); };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/gates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", stage: "Discovery", criteria: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function updateGateStatus(id: string, status: "pending" | "passed" | "failed") {
    await fetch("/api/gates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  const passed = gates.filter((g) => g.status === "passed").length;
  const readiness = readinessData?.readiness;
  const canEdit = session.role !== "operador";

  const byStage = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = gates.filter((g) => g.stage === s);
    return acc;
  }, {} as Record<string, Gate[]>);

  return (
    <div className="capital-shell">
      <header className="capital-context">
        <div>
          <span className="home-eyebrow">Capital system</span>
          <h1>Capital</h1>
          <p>Translate validation, execution reliability and explicit gates into an evidence-backed capital readiness system.</p>
        </div>
        <div className="capital-context-meta">
          <span className="home-eyebrow">Readiness</span>
          <strong>{readiness === null || readiness === undefined ? "Insufficient data" : `${readiness}%`}</strong>
          <small>{passed}/{gates.length} gate(s) passed</small>
        </div>
      </header>

      <section className={`capital-command capital-command-${(intelligence?.status ?? "SETUP").toLowerCase()}`}>
        <div className="capital-command-rail">
          <span className="home-eyebrow">Capital Intelligence</span>
          <span className="capital-command-status">{intelligence?.status ?? "SETUP"}</span>
        </div>
        <div>
          <span className="capital-command-kicker">{intelligence?.focus ?? "Evidence Base"}</span>
          <h2>{intelligence?.title ?? "Build the evidence required for capital readiness."}</h2>
          <p>{intelligence?.explanation ?? "VELA needs operating and market evidence before it can assess capital readiness."}</p>
        </div>
        <div className="capital-command-action">
          <Link className="btn-primary" href={intelligence?.action.href ?? "/build"}>{intelligence?.action.label ?? "Build evidence"} <span aria-hidden="true">→</span></Link>
          <small>{intelligence?.confidence ?? "LOW"} confidence · evidence grounded</small>
        </div>
      </section>

      <section className="capital-intelligence-strip">
        <CapitalStat label="Readiness" value={readiness === null || readiness === undefined ? "—" : `${readiness}%`} note="evidence-weighted" />
        <CapitalStat label="Passed gates" value={passed} note={`of ${gates.length} defined`} />
        <CapitalStat label="Market evidence" value={(readinessData?.evidence.signals.interviews ?? 0) + (readinessData?.evidence.signals.metrics ?? 0)} note="interviews + metrics" />
        <CapitalStat label="Execution proof" value={readinessData?.evidence.sprints.completed ?? 0} note="completed Sprints" />
      </section>

      <div className="capital-workspace">
        <ValuationLab />
        <InvestorIntelligenceLab />
        <CapitalDigitalTwin />
        <ScenarioOptimizer />
        <FundraisingIntelligence />

        {/* Readiness gauge */}
        <div className="os-card-accent" style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)", lineHeight: 1 }}>
              {readiness === null || readiness === undefined ? "—" : readiness}
              {readiness !== null && readiness !== undefined && <span style={{ fontSize: "1.25rem", color: "var(--ink-3)", fontWeight: 600 }}>%</span>}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginTop: "0.25rem" }}>Capital readiness</div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="os-progress" style={{ height: 8, marginBottom: "0.5rem" }}>
              <div
                className={`os-progress-fill ${readiness !== null && readiness !== undefined && readiness >= 70 ? "green" : readiness !== null && readiness !== undefined && readiness >= 40 ? "amber" : ""}`}
                style={{ width: `${readiness ?? 0}%` }}
              />
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}><span style={{ color: "var(--green)", fontWeight: 700 }}>{passed} / {gates.length}</span> gates superados</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}><span style={{ color: "var(--red)", fontWeight: 700 }}>{gates.filter(g => g.status === "failed").length}</span> fallidos</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}><span style={{ fontWeight: 700 }}>{gates.filter(g => g.status === "pending").length}</span> pendientes</div>
            </div>
          </div>
          <Link href="/velaseed" className="btn-ghost" style={{ flexShrink: 0 }}>Evaluar empresa →</Link>
        </div>

        {/* Evidence-based readiness (real data) */}
        {readinessData && (
          <div className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>Evidencia disponible</h3>
              {readinessData.status === "INSUFFICIENT_DATA" && (
                <span className="badge badge-amber">Datos insuficientes</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--ink-2)" }}>
              <span><strong>{readinessData.evidence.signals.interviews}</strong> entrevistas</span>
              <span><strong>{readinessData.evidence.signals.experiments}</strong> experimentos</span>
              <span><strong>{readinessData.evidence.signals.metrics}</strong> métricas</span>
              <span><strong>{readinessData.evidence.objectives.completed}</strong>/{readinessData.evidence.objectives.total} objetivos completados</span>
              <span><strong>{readinessData.evidence.sprints.completed}</strong>/{readinessData.evidence.sprints.total} sprints completados</span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>{readinessData.explanation}</p>
            {readinessData.missing.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {readinessData.missing.map((action) => (
                  <div key={action.href + action.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-3)", flex: 1, minWidth: 200 }}>{action.reason}</span>
                    <Link href={action.href} className="btn-ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", flexShrink: 0 }}>
                      {action.label} →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>Nuevo gate de capital</h3>
            <input className="os-input" placeholder="Nombre del gate (ej. MVP validado)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="os-input" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea className="os-input os-textarea" placeholder="Criterios de éxito" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} rows={2} />
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Crear gate"}</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Gates by stage */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[0,1,2].map(i => <div key={i} style={{ height: 72, borderRadius: "0.875rem", background: "var(--surface)" }} />)}
          </div>
        ) : gates.length === 0 ? (
          <div className="os-card" style={{ textAlign: "center", padding: "2.5rem" }}>
            <p style={{ color: "var(--ink-3)", marginBottom: "0.75rem" }}>Define los gates de capital de tu startup.</p>
            {canEdit && <button onClick={() => setShowForm(true)} className="btn-primary">Crear primer gate</button>}
          </div>
        ) : (
          STAGE_ORDER.filter(s => byStage[s]?.length > 0).map((stage) => (
            <div key={stage}>
              <h3 style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.75rem" }}>{stage}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {byStage[stage].map((g) => (
                  <div key={g.id} className="os-card os-hover-lift" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                        <span className={`badge ${GATE_BADGE[g.status]}`}>{GATE_LABEL[g.status]}</span>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--ink)" }}>{g.name}</span>
                      </div>
                      {g.criteria && <p style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>{g.criteria}</p>}
                    </div>
                    {canEdit && (
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                        {g.status !== "passed" && (
                          <button onClick={() => updateGateStatus(g.id, "passed")} className="badge badge-green" style={{ cursor: "pointer", border: "none" }}>Superado</button>
                        )}
                        {g.status !== "failed" && (
                          <button onClick={() => updateGateStatus(g.id, "failed")} className="badge badge-red" style={{ cursor: "pointer", border: "none" }}>Fallido</button>
                        )}
                        {g.status !== "pending" && (
                          <button onClick={() => updateGateStatus(g.id, "pending")} className="badge badge-ghost" style={{ cursor: "pointer", border: "none" }}>Pendiente</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CapitalStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="capital-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
