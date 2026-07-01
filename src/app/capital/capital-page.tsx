"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type Session = { name: string; email: string; role: string };

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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", stage: "Discovery", criteria: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/gates?limit=30");
    if (res.ok) setGates(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
  const pct = gates.length ? Math.round((passed / gates.length) * 100) : 0;
  const canEdit = session.role !== "operador";

  const byStage = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = gates.filter((g) => g.stage === s);
    return acc;
  }, {} as Record<string, Gate[]>);

  return (
    <div className="os-reveal" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="os-page-header">
        <div>
          <div className="os-page-title">Capital</div>
          <div className="os-page-sub">Gates de fundación y readiness para levantar capital</div>
        </div>
        {canEdit && <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo gate</button>}
      </div>

      <div style={{ padding: "1.5rem 2.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Readiness gauge */}
        <div className="os-card-accent" style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)", lineHeight: 1 }}>
              {pct}<span style={{ fontSize: "1.25rem", color: "var(--ink-3)", fontWeight: 600 }}>%</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginTop: "0.25rem" }}>Capital readiness</div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="os-progress" style={{ height: 8, marginBottom: "0.5rem" }}>
              <div
                className={`os-progress-fill ${pct >= 70 ? "green" : pct >= 40 ? "amber" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}><span style={{ color: "var(--green)", fontWeight: 700 }}>{passed}</span> superados</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}><span style={{ color: "var(--red)", fontWeight: 700 }}>{gates.filter(g => g.status === "failed").length}</span> fallidos</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}><span style={{ fontWeight: 700 }}>{gates.filter(g => g.status === "pending").length}</span> pendientes</div>
            </div>
          </div>
          <Link href="/velaseed" className="btn-ghost" style={{ flexShrink: 0 }}>Evaluar empresa →</Link>
        </div>

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
