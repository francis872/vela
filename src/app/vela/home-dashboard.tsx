"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DataState from "@/components/ui/data-state";
import Metric from "@/components/ui/metric";
import type { MetricResult } from "@/lib/functional-contracts";

type Session = { name: string; email: string; role: string };
type PulseAction = { id: string; title: string; reason: string; href: string; priority: "high" | "medium" | "low" };
type Activity = { id: string; kind: string; title: string; detail: string; createdAt: string };
type Sprint = { id: string; title: string; status: string; weekEnd: string; items: { id: string; title: string; done: boolean }[] };
type Pulse = {
  venture: { name: string; sector: string; stage: string; description: string | null } | null;
  phase: string | null;
  metrics: Record<string, MetricResult>;
  currentSprint: Sprint | null;
  trajectory: { assessment: { status: string; factors: string[] }; executionRisk: { status: string; level: string | null; factors: string[] }; validationRisk: { status: string; level: string | null; factors: string[] } };
  nextActions: PulseAction[];
  activity: Activity[];
  ai: { type: string; title: string; body: string; evidence: string };
};

const phaseLabels = ["idea", "validation", "traction", "growth"];
const phaseNames: Record<string, string> = { idea: "Discover", validation: "Validate", traction: "Build", growth: "Scale" };

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function relativeTime(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function phaseIndex(phase: string | null) {
  return phase ? Math.max(0, phaseLabels.indexOf(phase)) : -1;
}

export default function HomeDashboard({ session }: { session: Session }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void Promise.resolve().then(() => fetch("/api/home/pulse", { cache: "no-store" }))
      .then((response) => response.ok ? response.json() as Promise<Pulse> : null)
      .then((data) => { setPulse(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sprint = pulse?.currentSprint;
  const doneItems = sprint?.items.filter((item) => item.done).length ?? 0;
  const sprintTotal = sprint?.items.length ?? 0;
  const sprintProgress = sprintTotal > 0 ? Math.round((doneItems / sprintTotal) * 100) : null;
  const phase = phaseIndex(pulse?.phase ?? null);
  const sprintDays = sprint ? Math.ceil((new Date(sprint.weekEnd).getTime() - now) / 86400000) : null;

  return (
    <div className="home-pulse">
      <header className="home-context">
        <div>
          <div className="home-eyebrow">Venture Pulse</div>
          <h1>{greeting()}, {session.name.split(" ")[0]}.</h1>
          <p>{pulse?.venture?.description || "Your operating picture, grounded in the evidence VELA has today."}</p>
        </div>
        <div className="home-phase">
          <span className="home-eyebrow">Current phase</span>
          <strong>{pulse?.phase ? phaseNames[pulse.phase] ?? pulse.phase : "Insufficient data"}</strong>
          <div className="phase-track" aria-label="Venture phase">
            {phaseLabels.map((label, index) => <span key={label} className={index <= phase ? "is-current" : ""}>{phaseNames[label]}</span>)}
          </div>
        </div>
      </header>

      <section className="home-section home-pulse-section" aria-labelledby="pulse-title">
        <div className="home-section-heading"><div><span className="home-eyebrow">Live operating picture</span><h2 id="pulse-title">Venture Pulse</h2></div><span className="home-section-note">Real data. Real progress.</span></div>
        {loading ? <div className="home-loading" /> : pulse ? <div className="home-metric-grid">
          <Metric label="Execution Velocity" result={pulse.metrics.velocity} source="Sprints + decisions" />
          <Metric label="Validation Activity" result={pulse.metrics.validation} source="Signals" />
          <Metric label="Risk" result={pulse.metrics.risk} source="Execution risk rules" />
          <Metric label="Capital Readiness" result={pulse.metrics.readiness} source="Capital readiness API" />
        </div> : <DataState status="UNAVAILABLE" explanation="Venture Pulse could not be loaded." />}
      </section>

      <div className="home-main-grid">
        <main>
          <div className="home-feature-grid">
            <section className="home-sprint-panel" aria-labelledby="sprint-title">
              <div className="home-panel-label"><span>Current Sprint</span><span className={sprint?.status === "blocked" ? "status-dot danger" : "status-dot"}>{sprint ? sprint.status : "No active sprint"}</span></div>
              {sprint ? <>
                <h2 id="sprint-title">{sprint.title}</h2>
                <p className="home-panel-meta">{sprintDays !== null && sprintDays >= 0 ? `Ends in ${sprintDays} day${sprintDays === 1 ? "" : "s"}` : "Sprint period ended"}</p>
                <div className="home-progress"><span style={{ width: `${sprintProgress ?? 0}%` }} /></div>
                <div className="home-progress-meta"><span>{sprintProgress}% complete</span><span>{doneItems} of {sprintTotal} commitments</span></div>
                <div className="home-sprint-items">{sprint.items.slice(0, 6).map((item) => <div key={item.id} className={item.done ? "is-done" : ""}><span aria-hidden="true" />{item.title}</div>)}</div>
                <Link href="/engine" className="btn-primary home-panel-action">Open Sprint</Link>
              </> : <DataState status="INSUFFICIENT_DATA" explanation="Create a Sprint to establish an execution cadence." action={{ label: "Planear", href: "/engine" }} />}
            </section>
            <section className="home-ai-panel" aria-labelledby="ai-title">
              <div className="home-panel-label"><span>VELA AI</span><span className="home-ai-kind">{pulse?.ai.type ?? "OBSERVATION"}</span></div>
              <h2 id="ai-title">{pulse?.ai.title ?? "Strategic insight, not noise."}</h2>
              <p>{pulse?.ai.body ?? "Add operational evidence for a more specific recommendation."}</p>
              {pulse?.ai.evidence && <span className="home-panel-meta">Evidence: {pulse.ai.evidence}</span>}
            </section>
          </div>

          <div className="home-lower-grid">
            <section className="home-surface-panel" aria-labelledby="trajectory-title">
              <div className="home-section-heading"><div><span className="home-eyebrow">Based on real execution and validation signals</span><h2 id="trajectory-title">Trajectory</h2></div><span className="home-traj-status">{pulse?.trajectory.assessment.status ?? "—"}</span></div>
              {pulse?.trajectory.assessment.status === "INSUFFICIENT_DATA" ? <DataState status="INSUFFICIENT_DATA" explanation={pulse.trajectory.assessment.factors[0]} /> : <div className="trajectory-content"><div className="trajectory-line" aria-hidden="true"><span /><span /><span /><span /></div><div><strong>{pulse?.trajectory.assessment.status.replaceAll("_", " ") ?? "Unavailable"}</strong><p>{pulse?.trajectory.assessment.factors.join(" · ")}</p></div></div>}
            </section>
            <section className="home-surface-panel" aria-labelledby="key-metrics-title">
              <div className="home-section-heading"><div><span className="home-eyebrow">Real data only</span><h2 id="key-metrics-title">Key Metrics</h2></div></div>
              <div className="key-metrics-list">{["completedSprints", "activeObjectives", "interviews", "insights", "momentum"].map((key) => { const metric = pulse?.metrics[key]; return <div key={key}><span>{metric?.label ?? key}</span><strong>{metric?.value ?? "—"}</strong></div>; })}</div>
            </section>
          </div>
        </main>

        <aside className="home-context-column">
          <section className="home-side-panel" aria-labelledby="next-actions-title"><div className="home-section-heading"><h2 id="next-actions-title">Next Actions</h2><span>{pulse?.nextActions.length ?? 0}</span></div>{pulse?.nextActions.length ? pulse.nextActions.slice(0, 4).map((action) => <Link href={action.href} key={action.id} className="home-action"><span className={`action-mark ${action.priority}`} /><span><strong>{action.title}</strong><small>{action.reason}</small></span><b aria-hidden="true">→</b></Link>) : <DataState status="INSUFFICIENT_DATA" explanation="No action is prioritized until more venture evidence exists." />}</section>
          <section className="home-side-panel" aria-labelledby="activity-title"><div className="home-section-heading"><h2 id="activity-title">Recent Activity</h2><span>Persisted records</span></div>{pulse?.activity.length ? <div className="home-activity">{pulse.activity.map((item) => <div key={item.id}><span className="activity-line" /><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{relativeTime(item.createdAt)}</time></div>)}</div> : <DataState status="INSUFFICIENT_DATA" explanation="Activity will appear after objectives, signals, Sprints or gates are recorded." />}</section>
          <section className="home-network-panel"><span className="home-eyebrow">Network</span><h2>A global generation of builders.</h2><p>Connect, collaborate and go further when the venture is ready.</p><Link href="/network" className="btn-ghost">Explore Network</Link></section>
        </aside>
      </div>
    </div>
  );
}
