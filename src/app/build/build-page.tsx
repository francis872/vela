"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import GraphView from "./graph-view";

type Session = { name: string; email: string; role: string };

type Objective = {
  id: string;
  title: string;
  description?: string | null;
  status: "on_track" | "at_risk" | "blocked" | "completed";
  priority: number;
  dueDate?: string | null;
  ownerName: string;
  createdAt: string;
  _count?: { signals: number };
};

const STATUS_OPTIONS = [
  { value: "on_track",  label: "En Curso",   color: "var(--green)" },
  { value: "at_risk",   label: "En Riesgo",  color: "var(--amber)" },
  { value: "blocked",   label: "Bloqueado",  color: "var(--red)" },
  { value: "completed", label: "Completado", color: "var(--ink-3)" },
];

const STATUS_BADGE: Record<string, string> = {
  on_track:  "badge-green",
  at_risk:   "badge-amber",
  blocked:   "badge-red",
  completed: "badge-ghost",
};

const STATUS_LABEL: Record<string, string> = {
  on_track:  "En Curso",
  at_risk:   "En Riesgo",
  blocked:   "Bloqueado",
  completed: "Completado",
};

const COLUMNS = ["on_track", "at_risk", "blocked", "completed"] as const;

export default function BuildPage({ session }: { session: Session }) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"board" | "graph">("board");

  const [form, setForm] = useState({
    title: "", description: "", status: "on_track", priority: "1", dueDate: ""
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/objectives?limit=50");
    if (res.ok) setObjectives(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: Number(form.priority),
        dueDate: form.dueDate || null,
      }),
    });
    setForm({ title: "", description: "", status: "on_track", priority: "1", dueDate: "" });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/objectives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  async function deleteObj(id: string) {
    if (!confirm("¿Eliminar este objetivo?")) return;
    await fetch("/api/objectives", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const displayed = filter === "all" ? objectives : objectives.filter((o) => o.status === filter);

  return (
    <div className="os-reveal" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <div className="os-page-header">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="os-page-title">Build</div>
          <div className="os-page-sub">Objetivos de ejecución de tu startup</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Tab toggle */}
          <div style={{ display: "flex", gap: "0.25rem", background: "var(--surface)", borderRadius: "0.6rem", padding: "0.2rem" }}>
            {(["board", "graph"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={activeTab === t ? "btn-primary" : "btn-ghost"}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", borderRadius: "0.45rem" }}
              >
                {t === "board" ? "Tablero" : "Grafo"}
              </button>
            ))}
          </div>
          {activeTab === "board" && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Nuevo objetivo
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "1.5rem 2.5rem", flex: 1 }}>

        {/* Graph tab */}
        {activeTab === "graph" && <GraphView />}

        {/* Board tab */}
        {activeTab === "board" && (<>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={filter === s.value ? "btn-primary" : "btn-ghost"}
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.8rem" }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="os-card" style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)", marginBottom: "0.25rem" }}>Nuevo objetivo</h3>
            <input
              className="os-input"
              placeholder="¿Qué quieres lograr?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="os-input os-textarea"
              placeholder="Descripción (opcional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <select className="os-input" style={{ flex: 1 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select className="os-input" style={{ flex: 1 }} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="1">Prioridad 1</option>
                <option value="2">Prioridad 2</option>
                <option value="3">Prioridad 3</option>
              </select>
              <input type="date" className="os-input" style={{ flex: 1 }} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Crear objetivo"}</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Board */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {COLUMNS.map((c) => <div key={c} style={{ height: 200, borderRadius: "0.875rem", background: "var(--surface)" }} />)}
          </div>
        ) : filter === "all" ? (
          /* Kanban view when showing all */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", overflowX: "auto" }}>
            {COLUMNS.map((col) => {
              const colObj = objectives.filter((o) => o.status === col);
              return (
                <div key={col} style={{ background: "var(--surface)", borderRadius: "0.875rem", border: "1px solid var(--border)", padding: "1rem", minHeight: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <span className={`badge ${STATUS_BADGE[col]}`}>{STATUS_LABEL[col]}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>{colObj.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {colObj.map((o) => (
                      <ObjectiveCard key={o.id} obj={o} onStatus={updateStatus} onDelete={deleteObj} canDelete={session.role !== "operador"} />
                    ))}
                    {colObj.length === 0 && <p style={{ fontSize: "0.78rem", color: "var(--ink-3)", textAlign: "center", paddingTop: "0.5rem" }}>Vacío</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view for filtered */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {displayed.length === 0 && <p style={{ color: "var(--ink-3)" }}>Sin objetivos en esta categoría.</p>}
            {displayed.map((o) => (
              <ObjectiveCard key={o.id} obj={o} onStatus={updateStatus} onDelete={deleteObj} canDelete={session.role !== "operador"} compact />
            ))}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

function ObjectiveCard({
  obj, onStatus, onDelete, canDelete, compact
}: {
  obj: Objective;
  onStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="os-card-sm os-hover-lift" style={{ cursor: "pointer" }} onClick={() => setOpen(!open)}>
      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.3rem", letterSpacing: "-0.01em" }}>{obj.title}</p>
      {obj.description && <p style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginBottom: "0.3rem" }}>{obj.description}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>{obj.ownerName}</span>
        {obj.dueDate && <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>· {new Date(obj.dueDate).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span>}
        {obj._count && <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>· {obj._count.signals} señales</span>}
      </div>

      {open && !compact && (
        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
          {["on_track","at_risk","blocked","completed"].map((s) => (
            <button
              key={s}
              onClick={() => onStatus(obj.id, s)}
              className={`badge ${STATUS_BADGE[s]}`}
              style={{ cursor: "pointer", border: obj.status === s ? "1px solid currentColor" : "1px solid transparent" }}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          {canDelete && (
            <button onClick={() => onDelete(obj.id)} style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--red)", background: "none", border: "none", cursor: "pointer" }}>Eliminar</button>
          )}
        </div>
      )}
    </div>
  );
}
