"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import GraphView from "./graph-view";

type Session = { name: string; email: string; role: string };

type BuildIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  focusObjectiveId: string | null;
  focusObjectiveTitle: string | null;
  action: { label: string; view: "board" | "graph"; filter?: string };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  graph: {
    criticalPath: string[];
    criticalPathTitles: string[];
    topBlockers: { id: string; title: string; downstream: number }[];
    riskCascades: { id: string; title: string; affected: number }[];
    hasCycle: boolean;
  };
  coverage: {
    ratio: number;
    blindSpots: { id: string; title: string; priority: number }[];
    nextToValidate: string | null;
  };
  prematureWork: {
    id: string;
    title: string;
    unmetDependencies: { id: string; title: string; status: string }[];
  }[];
};

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
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
] as const;

const STATUS_LABEL: Record<Objective["status"], string> = {
  on_track: "On track",
  at_risk: "At risk",
  blocked: "Blocked",
  completed: "Completed",
};

const COLUMNS = ["on_track", "at_risk", "blocked", "completed"] as const;

export default function BuildPage({ session }: { session: Session }) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState<BuildIntelligence | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"board" | "graph">("board");
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "on_track",
    priority: "1",
    dueDate: "",
  });

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [objectivesRes, intelligenceRes] = await Promise.all([
        fetch("/api/objectives?limit=50", { cache: "no-store" }),
        fetch("/api/build/intelligence", { cache: "no-store" }),
      ]);
      if (objectivesRes.ok) setObjectives(await objectivesRes.json());
      if (intelligenceRes.ok) {
        const payload = await intelligenceRes.json();
        setIntelligence(payload.intelligence ?? null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const stream = new EventSource("/api/home/events");
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void load(true), 250);
    };
    stream.addEventListener("domain-event", refresh);
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      stream.close();
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/objectives", {
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
      if (!response.ok) return;
      setForm({ title: "", description: "", status: "on_track", priority: "1", dueDate: "" });
      setShowForm(false);
      await load(true);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const response = await fetch("/api/objectives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) await load(true);
  }

  async function deleteObj(id: string) {
    if (!confirm("Delete this objective?")) return;
    const response = await fetch("/api/objectives", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) await load(true);
  }

  const stats = useMemo(() => ({
    total: objectives.length,
    active: objectives.filter((o) => o.status !== "completed").length,
    blocked: objectives.filter((o) => o.status === "blocked").length,
    atRisk: objectives.filter((o) => o.status === "at_risk").length,
    completed: objectives.filter((o) => o.status === "completed").length,
    evidence: objectives.reduce((sum, o) => sum + (o._count?.signals ?? 0), 0),
  }), [objectives]);

  const buildFocus = intelligence ?? {
    status: objectives.length ? "STABLE" as const : "SETUP" as const,
    title: objectives.length ? "Analyzing execution structure…" : "Define the first execution objective.",
    explanation: objectives.length
      ? "Build Intelligence is evaluating dependencies, evidence coverage and execution risk."
      : "Build Intelligence needs a persisted objective before it can analyze execution structure.",
    focusObjectiveId: null,
    focusObjectiveTitle: null,
    action: { label: objectives.length ? "Review board" : "Create objective", view: "board" as const },
    confidence: "LOW" as const,
    evidence: [],
    graph: { criticalPath: [], criticalPathTitles: [], topBlockers: [], riskCascades: [], hasCycle: false },
    coverage: { ratio: 0, blindSpots: [], nextToValidate: null },
    prematureWork: [],
  };

  const displayed = filter === "all" ? objectives : objectives.filter((o) => o.status === filter);

  return (
    <div className="build-shell">
      <header className="build-context">
        <div>
          <span className="home-eyebrow">Execution system</span>
          <h1>Build</h1>
          <p>Turn venture priorities into explicit objectives, dependencies and measurable execution.</p>
        </div>
        <div className="build-context-meta">
          <span className="home-eyebrow">Operator</span>
          <strong>{session.name}</strong>
          <small>{stats.active} active objectives · {stats.evidence} evidence signals</small>
        </div>
      </header>

      <section className={`build-command build-command-${buildFocus.status.toLowerCase()}`}>
        <div className="build-command-rail">
          <span className="home-eyebrow">Build Intelligence</span>
          <span className="build-command-status">{buildFocus.status}</span>
        </div>
        <div>
          <span className="build-command-kicker">Execution focus</span>
          <h2>{buildFocus.title}</h2>
          <p>{buildFocus.explanation}</p>
        </div>
        <div className="build-command-action">
          <button className="btn-primary" onClick={() => {
            setActiveTab(buildFocus.action.view);
            if (buildFocus.action.filter) setFilter(buildFocus.action.filter);
            if (buildFocus.status === "SETUP") setShowForm(true);
          }}>
            {buildFocus.action.label} <span aria-hidden="true">→</span>
          </button>
          <small>{buildFocus.confidence} confidence · deterministic evidence</small>
        </div>
      </section>

      {intelligence && objectives.length > 0 && (
        <section className="build-intelligence-detail">
          <div className="build-intelligence-stat">
            <span>Evidence coverage</span>
            <strong>{Math.round(intelligence.coverage.ratio * 100)}%</strong>
            <small>{intelligence.coverage.blindSpots.length} blind spot(s)</small>
          </div>
          <div className="build-intelligence-stat">
            <span>Critical path</span>
            <strong>{intelligence.graph.criticalPath.length || "—"}</strong>
            <small>{intelligence.graph.criticalPathTitles.slice(0, 2).join(" → ") || "No dependency chain"}</small>
          </div>
          <div className="build-intelligence-stat">
            <span>Top blocker</span>
            <strong>{intelligence.graph.topBlockers[0]?.downstream ?? 0}</strong>
            <small>{intelligence.graph.topBlockers[0]?.title ?? "No downstream blocker"}</small>
          </div>
          <div className="build-intelligence-stat">
            <span>Not ready</span>
            <strong>{intelligence.prematureWork.length}</strong>
            <small>Objectives with unmet prerequisites</small>
          </div>
        </section>
      )}

      <section className="build-pulse" aria-labelledby="build-pulse-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">Live execution picture</span>
            <h2 id="build-pulse-title">Execution Pulse</h2>
          </div>
          <span className="home-section-note">Real objectives. Real evidence.</span>
        </div>
        <div className="build-metric-grid">
          <BuildMetric label="Active" value={stats.active} note="Open objectives" />
          <BuildMetric label="Blocked" value={stats.blocked} note="Immediate constraints" tone={stats.blocked ? "danger" : undefined} />
          <BuildMetric label="At risk" value={stats.atRisk} note="Needs intervention" tone={stats.atRisk ? "warning" : undefined} />
          <BuildMetric label="Evidence" value={stats.evidence} note="Linked signals" />
          <BuildMetric label="Completed" value={stats.completed} note="Execution outcomes" />
        </div>
      </section>

      <section className="build-workspace">
        <div className="build-toolbar">
          <div className="build-tabs" role="tablist" aria-label="Build views">
            <button className={activeTab === "board" ? "is-active" : ""} onClick={() => setActiveTab("board")}>Board</button>
            <button className={activeTab === "graph" ? "is-active" : ""} onClick={() => setActiveTab("graph")}>Dependency Graph</button>
          </div>
          {activeTab === "board" && <button className="btn-primary" onClick={() => setShowForm((value) => !value)}>+ New objective</button>}
        </div>

        {showForm && activeTab === "board" && (
          <form onSubmit={handleCreate} className="build-create-panel">
            <div className="build-create-heading">
              <div><span className="home-eyebrow">Execution contract</span><h2>New objective</h2></div>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <label>Outcome<input className="os-input" placeholder="What must change?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Context<textarea className="os-input os-textarea" placeholder="Why does this matter?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></label>
            <div className="build-create-grid">
              <label>Status<select className="os-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
              <label>Priority<select className="os-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="1">Priority 1</option><option value="2">Priority 2</option><option value="3">Priority 3</option></select></label>
              <label>Due date<input type="date" className="os-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
            </div>
            <div className="build-create-actions"><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Creating…" : "Create objective"}</button><span>Every objective becomes part of Home, Trajectory and Event Store.</span></div>
          </form>
        )}

        {activeTab === "graph" ? <div className="build-graph-shell"><GraphView /></div> : (
          <>
            <div className="build-filter-bar">
              {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((s) => (
                <button key={s.value} className={filter === s.value ? "is-active" : ""} onClick={() => setFilter(s.value)}>
                  {s.label}
                  <span>{s.value === "all" ? stats.total : objectives.filter((o) => o.status === s.value).length}</span>
                </button>
              ))}
            </div>

            {loading ? <div className="build-loading-grid">{COLUMNS.map((column) => <div key={column} />)}</div> : filter === "all" ? (
              <div className="build-board">
                {COLUMNS.map((column) => {
                  const items = objectives.filter((o) => o.status === column);
                  return (
                    <section key={column} className={`build-column build-column-${column}`}>
                      <header><div><span className="build-column-dot" /><h3>{STATUS_LABEL[column]}</h3></div><span>{items.length}</span></header>
                      <div className="build-column-body">
                        {items.map((objective) => <ObjectiveCard key={objective.id} obj={objective} onStatus={updateStatus} onDelete={deleteObj} canDelete={session.role !== "operador"} />)}
                        {!items.length && <div className="build-empty">No objectives</div>}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="build-list">
                {!displayed.length && <div className="build-empty">No objectives in this state.</div>}
                {displayed.map((objective) => <ObjectiveCard key={objective.id} obj={objective} onStatus={updateStatus} onDelete={deleteObj} canDelete={session.role !== "operador"} compact />)}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function BuildMetric({ label, value, note, tone }: { label: string; value: number; note: string; tone?: "danger" | "warning" }) {
  return <div className={`build-metric ${tone ? `build-metric-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function ObjectiveCard({ obj, onStatus, onDelete, canDelete, compact }: {
  obj: Objective;
  onStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const overdue = obj.dueDate && new Date(obj.dueDate).getTime() < Date.now() && obj.status !== "completed";

  return (
    <article className={`build-objective ${compact ? "is-compact" : ""}`} onClick={() => setOpen((value) => !value)}>
      <div className="build-objective-top">
        <span className={`build-priority p${obj.priority}`}>P{obj.priority}</span>
        <span className={`build-state build-state-${obj.status}`}>{STATUS_LABEL[obj.status]}</span>
      </div>
      <h4>{obj.title}</h4>
      {obj.description && <p>{obj.description}</p>}
      <div className="build-objective-meta">
        <span>{obj._count?.signals ?? 0} evidence</span>
        {obj.dueDate && <span className={overdue ? "is-overdue" : ""}>{overdue ? "Overdue · " : ""}{new Date(obj.dueDate).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>}
      </div>
      {open && (
        <div className="build-objective-actions" onClick={(e) => e.stopPropagation()}>
          {COLUMNS.map((status) => <button key={status} className={obj.status === status ? "is-current" : ""} onClick={() => void onStatus(obj.id, status)}>{STATUS_LABEL[status]}</button>)}
          {canDelete && <button className="is-delete" onClick={() => void onDelete(obj.id)}>Delete</button>}
        </div>
      )}
    </article>
  );
}
