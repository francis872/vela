"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SignalType, ValidationCoverageResponse } from "@/lib/functional-contracts";

type Session = { name: string; email: string; role: string };
type Signal = {
  id: string;
  type: "experiment" | "interview" | "metric" | "insight";
  title: string;
  result?: string | null;
  hypothesis?: string | null;
  learning?: string | null;
  objectiveId?: string | null;
  ownerName: string;
  createdAt: string;
};
type CoverageNode = { id: string; title: string; status: string; signalCount: number; signalTypes: string[] };
type CoverageAnalysis = { blindSpots: string[]; hubs: string[]; coverageMap: Record<string, number>; coverageRatio: number; nextToValidate: string[] };
type Objective = { id: string; title: string; status: string };
type ValidateIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  focusObjectiveId: string | null;
  focusObjectiveTitle: string | null;
  suggestedSignalType: SignalType;
  actionLabel: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  coverage: { ratio: number; blindSpots: { id: string; title: string; priority: number }[]; nextToValidate: string | null };
  signalMix: { experiment: number; interview: number; metric: number; insight: number; diversity: number; unlinked: number };
};

const SIGNAL_TYPES = [
  { value: "experiment", label: "Experiment", desc: "Test a hypothesis with a measurable result" },
  { value: "interview", label: "Interview", desc: "Direct customer or user evidence" },
  { value: "metric", label: "Metric", desc: "Observed quantitative evidence" },
  { value: "insight", label: "Insight", desc: "A qualitative learning worth retaining" },
] as const;

export default function ValidatePage({ session }: { session: Session }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [coverageNodes, setCoverageNodes] = useState<CoverageNode[]>([]);
  const [coverageAnalysis, setCoverageAnalysis] = useState<CoverageAnalysis | null>(null);
  const [intelligence, setIntelligence] = useState<ValidateIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ type: "experiment" as SignalType, title: "", result: "", hypothesis: "", learning: "", objectiveId: "" });

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [signalsRes, coverageRes, objectivesRes, intelligenceRes] = await Promise.all([
        fetch("/api/signals?limit=50", { cache: "no-store" }),
        fetch("/api/validate/coverage", { cache: "no-store" }),
        fetch("/api/objectives?limit=100", { cache: "no-store" }),
        fetch("/api/validate/intelligence", { cache: "no-store" }),
      ]);
      if (signalsRes.ok) setSignals(await signalsRes.json());
      if (coverageRes.ok) {
        const data = (await coverageRes.json()) as ValidationCoverageResponse;
        setCoverageNodes(data.nodes ?? []);
        setCoverageAnalysis(data.analysis as CoverageAnalysis);
      }
      if (objectivesRes.ok) setObjectives(await objectivesRes.json());
      if (intelligenceRes.ok) {
        const data = await intelligenceRes.json();
        setIntelligence(data.intelligence ?? null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stream = new EventSource("/api/home/events");
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(true), 250);
    };
    stream.addEventListener("domain-event", refresh);
    return () => { if (timer) clearTimeout(timer); stream.close(); };
  }, []);

  function openIntelligentSignal() {
    setForm((current) => ({
      ...current,
      type: intelligence?.suggestedSignalType ?? "interview",
      objectiveId: intelligence?.focusObjectiveId ?? current.objectiveId,
    }));
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, objectiveId: form.objectiveId || undefined }),
      });
      if (!response.ok) return;
      setForm({ type: "experiment", title: "", result: "", hypothesis: "", learning: "", objectiveId: "" });
      setShowForm(false);
      await load(true);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSignal(id: string) {
    if (!confirm("Delete this signal?")) return;
    const response = await fetch("/api/signals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) await load(true);
  }

  const displayed = filter === "all" ? signals : signals.filter((signal) => signal.type === filter);
  const counts = useMemo(() => Object.fromEntries(SIGNAL_TYPES.map((type) => [type.value, signals.filter((signal) => signal.type === type.value).length])), [signals]);
  const coverage = intelligence?.coverage.ratio ?? coverageAnalysis?.coverageRatio ?? 0;

  return (
    <div className="validate-shell">
      <header className="validate-context">
        <div>
          <span className="home-eyebrow">Evidence system</span>
          <h1>Validate</h1>
          <p>Connect customer evidence, experiments and metrics directly to the execution assumptions VELA is tracking.</p>
        </div>
        <div className="validate-context-meta">
          <span className="home-eyebrow">Operator</span>
          <strong>{session.name}</strong>
          <small>{signals.length} signals · {Math.round(coverage * 100)}% objective coverage</small>
        </div>
      </header>

      <section className={`validate-command validate-command-${(intelligence?.status ?? "SETUP").toLowerCase()}`}>
        <div className="validate-command-rail">
          <span className="home-eyebrow">Validate Intelligence</span>
          <span className="validate-command-status">{intelligence?.status ?? "SETUP"}</span>
        </div>
        <div>
          <span className="validate-command-kicker">Evidence focus</span>
          <h2>{intelligence?.title ?? "Build a validation evidence base."}</h2>
          <p>{intelligence?.explanation ?? "VELA is waiting for enough persisted evidence to identify the next validation priority."}</p>
          {intelligence?.focusObjectiveTitle && <small className="validate-focus-objective">Focus · {intelligence.focusObjectiveTitle}</small>}
        </div>
        <div className="validate-command-action">
          <button className="btn-primary" onClick={openIntelligentSignal}>{intelligence?.actionLabel ?? "New signal"} <span aria-hidden="true">→</span></button>
          <small>{intelligence?.confidence ?? "LOW"} confidence · evidence grounded</small>
        </div>
      </section>

      <section className="validate-intelligence-strip">
        <ValidateStat label="Coverage" value={`${Math.round(coverage * 100)}%`} note={`${intelligence?.coverage.blindSpots.length ?? coverageAnalysis?.blindSpots.length ?? 0} blind spot(s)`} />
        <ValidateStat label="Signal diversity" value={intelligence?.signalMix.diversity ?? 0} note="of 4 evidence types" />
        <ValidateStat label="Customer evidence" value={counts.interview ?? 0} note="interviews" />
        <ValidateStat label="Unlinked" value={intelligence?.signalMix.unlinked ?? 0} note="signals without objective" />
      </section>

      <section className="validate-workspace">
        <div className="home-section-heading">
          <div><span className="home-eyebrow">Validation pulse</span><h2>Evidence Coverage</h2></div>
          <button className="btn-primary" onClick={openIntelligentSignal}>+ New signal</button>
        </div>

        <div className="validate-type-grid">
          {SIGNAL_TYPES.map((type) => (
            <button key={type.value} className={filter === type.value ? "is-active" : ""} onClick={() => setFilter(filter === type.value ? "all" : type.value)}>
              <span>{type.label}</span><strong>{counts[type.value] ?? 0}</strong><small>{type.desc}</small>
            </button>
          ))}
        </div>

        {coverageNodes.length > 0 && (
          <div className="validate-coverage">
            <div className="validate-coverage-head"><span>Objective coverage</span><strong>{Math.round(coverage * 100)}%</strong></div>
            <div className="validate-coverage-track"><span style={{ width: `${coverage * 100}%` }} /></div>
            <div className="validate-coverage-grid">
              <div>
                <span className="home-eyebrow">Blind spots</span>
                {(intelligence?.coverage.blindSpots ?? []).slice(0, 4).map((objective) => <button key={objective.id} onClick={() => { setForm((current) => ({ ...current, objectiveId: objective.id })); setShowForm(true); }}>{objective.title}<span>Validate →</span></button>)}
                {!intelligence?.coverage.blindSpots.length && <p>No uncovered active objective.</p>}
              </div>
              <div>
                <span className="home-eyebrow">Coverage by objective</span>
                {coverageNodes.slice(0, 6).map((node) => (
                  <div className="validate-coverage-row" key={node.id}><span>{node.title}</span><div><i style={{ width: `${Math.min(node.signalCount / 5 * 100, 100)}%` }} /></div><strong>{node.signalCount}</strong></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="validate-create-panel">
            <div className="validate-create-heading"><div><span className="home-eyebrow">Evidence contract</span><h2>Record signal</h2></div><button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Close</button></div>
            <div className="validate-type-selector">
              {SIGNAL_TYPES.map((type) => <button type="button" key={type.value} className={form.type === type.value ? "is-active" : ""} onClick={() => setForm({ ...form, type: type.value as SignalType })}>{type.label}</button>)}
            </div>
            <label>Observation<input className="os-input" placeholder="What did you observe or measure?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Build objective<select className="os-input" value={form.objectiveId} onChange={(e) => setForm({ ...form, objectiveId: e.target.value })}><option value="">Unlinked evidence</option>{objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}</select></label>
            <div className="validate-create-grid">
              <label>Hypothesis<input className="os-input" value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} /></label>
              <label>Result<input className="os-input" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></label>
            </div>
            <label>Learning<textarea className="os-input os-textarea" rows={3} value={form.learning} onChange={(e) => setForm({ ...form, learning: e.target.value })} /></label>
            <div className="validate-create-actions"><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Recording…" : "Record evidence"}</button><span>This signal will update Build coverage and VELA Intelligence.</span></div>
          </form>
        )}

        <div className="validate-log-head"><div><span className="home-eyebrow">Persisted evidence</span><h2>Signal Log</h2></div><span>{displayed.length} shown</span></div>
        {loading ? <div className="validate-loading"><div /><div /><div /></div> : displayed.length === 0 ? (
          <div className="validate-empty"><p>{signals.length ? "No signals match this evidence type." : "No validation evidence has been recorded yet."}</p><button className="btn-primary" onClick={openIntelligentSignal}>Record first signal</button></div>
        ) : (
          <div className="validate-signal-list">
            {displayed.map((signal) => (
              <article key={signal.id} className="validate-signal">
                <div className="validate-signal-top"><span className={`validate-signal-type type-${signal.type}`}>{signal.type}</span><span>{new Date(signal.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span></div>
                <h3>{signal.title}</h3>
                {signal.hypothesis && <p><strong>Hypothesis</strong>{signal.hypothesis}</p>}
                {signal.result && <p><strong>Result</strong>{signal.result}</p>}
                {signal.learning && <blockquote>{signal.learning}</blockquote>}
                <div className="validate-signal-foot"><span>{coverageNodes.find((node) => node.id === signal.objectiveId)?.title ?? "Unlinked evidence"}</span>{session.role !== "operador" && <button onClick={() => void deleteSignal(signal.id)}>Delete</button>}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ValidateStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="validate-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
