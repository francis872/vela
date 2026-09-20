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
type Command = {
  status: "ATTENTION" | "FOCUS" | "STABLE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  explanation: string;
  action: { title: string; href: string };
  evidence: string[];
  affectedMetric: string;
};
type Pulse = {
  venture: { name: string; sector: string; stage: string; description: string | null } | null;
  phase: string | null;
  metrics: Record<string, MetricResult>;
  command: Command;
  currentSprint: Sprint | null;
  trajectory: {
    assessment: { status: string; factors: string[] };
    executionRisk: { status: string; level: string | null; factors: string[] };
    validationRisk: { status: string; level: string | null; factors: string[] };
    rootCause: {
      status: "AVAILABLE" | "INSUFFICIENT_DATA" | "NO_DOMINANT_CAUSE";
      primary: { metric: string; label: string; direction: string; delta: number; velocityPerDay: number; firstMeaningfulChangeAt: string; leadHours: number | null; impact: number } | null;
      contributors: { metric: string; label: string; direction: string; delta: number; velocityPerDay: number; firstMeaningfulChangeAt: string; leadHours: number | null; impact: number }[];
      explanation: string;
      confidence: "LOW" | "MEDIUM" | "HIGH";
    };
    history: {
      status: "AVAILABLE" | "INSUFFICIENT_DATA";
      direction: "IMPROVING" | "STABLE" | "DECLINING" | null;
      velocityPerDay: number | null;
      delta: number | null;
      daysObserved: number | null;
      explanation: string;
      points: { capturedAt: string; velocity: number | null; validation: number | null; risk: number | null; readiness: number | null; sprintCompletion: number | null }[];
      dynamics: {
        status: "AVAILABLE" | "INSUFFICIENT_DATA";
        state: "ACCELERATING" | "DECELERATING" | "DETERIORATING" | "TURNING_POSITIVE" | "TURNING_NEGATIVE" | "STEADY" | null;
        previousVelocityPerDay: number | null;
        recentVelocityPerDay: number | null;
        accelerationPerDay2: number | null;
        explanation: string;
      };
    };
  };
  nextActions: PulseAction[];
  interventions: { id: string; title: string; targetMetric: string; status: string; outcomeStatus: string | null; outcomeDelta: number | null; actionHref: string; deadline: string | null }[];
  interventionProposal: { title: string; hypothesis: string; source: string; sourceEvidence: string[]; targetMetric: string; baselineValue: number | null; targetDelta: number; deadlineDays: number; actionTitle: string; actionHref: string };
  learningMemory: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA";
    explanation: string;
    recommendation: { actionTitle: string; effectiveness: number; confidence: string; lesson: string } | null;
    avoidedAction: { actionTitle: string; effectiveness: number; confidence: string; lesson: string } | null;
    memories: { id: string; actionTitle: string; outcomeStatus: string; effectiveness: number; confidence: string; lesson: string }[];
  };
  activity: Activity[];
  ai: {
    type: "STRATEGIC_INTERPRETATION" | "OBSERVATION";
    title: string;
    body: string;
    thesis: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    evidence: string[];
    tensions: string[];
    focus: string;
  };
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
  const [creatingIntervention, setCreatingIntervention] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void Promise.resolve().then(() => fetch("/api/home/pulse", { cache: "no-store" }))
      .then((response) => response.ok ? response.json() as Promise<Pulse> : null)
      .then((data) => { setPulse(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function acceptIntervention() {
    if (!pulse?.interventionProposal || creatingIntervention) return;
    setCreatingIntervention(true);
    try {
      const response = await fetch("/api/home/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pulse.interventionProposal),
      });
      if (!response.ok) return;
      const refresh = await fetch("/api/home/pulse", { cache: "no-store" });
      if (refresh.ok) setPulse(await refresh.json());
    } finally {
      setCreatingIntervention(false);
    }
  }

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

      {!loading && pulse?.command && (
        <section className={`home-command home-command-${pulse.command.status.toLowerCase()}`} aria-labelledby="command-title">
          <div className="home-command-rail">
            <span className="home-eyebrow">VELA Today</span>
            <span className={`home-command-status ${pulse.command.priority.toLowerCase()}`}>{pulse.command.status}</span>
          </div>
          <div className="home-command-copy">
            <span className="home-command-kicker">What needs your attention</span>
            <h2 id="command-title">{pulse.command.title}</h2>
            <p>{pulse.command.explanation}</p>
            <div className="home-command-evidence">
              <span>Affects {pulse.command.affectedMetric}</span>
              <span>{pulse.command.evidence.length} evidence source{pulse.command.evidence.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="home-command-action">
            <Link href={pulse.command.action.href} className="btn-primary">
              {pulse.command.action.title}
              <span aria-hidden="true">→</span>
            </Link>
            <small>Recommended from current venture evidence</small>
          </div>
        </section>
      )}

      {!loading && pulse?.interventionProposal && (
        <section className="home-intervention" aria-labelledby="intervention-title">
          <div>
            <span className="home-eyebrow">Intervention Engine</span>
            <h2 id="intervention-title">{pulse.interventionProposal.title}</h2>
            <p>{pulse.interventionProposal.hypothesis}</p>
          </div>
          <div className="home-intervention-target">
            <span>Target</span>
            <strong>{pulse.interventionProposal.targetMetric}</strong>
            <small>{pulse.interventionProposal.targetDelta >= 0 ? "+" : ""}{pulse.interventionProposal.targetDelta} pts · {pulse.interventionProposal.deadlineDays} days</small>
          </div>
          <button type="button" className="btn-secondary" onClick={acceptIntervention} disabled={creatingIntervention}>
            {creatingIntervention ? "Creating…" : "Start intervention"}
          </button>
          {pulse.learningMemory?.status === "AVAILABLE" && (
            <div className="home-learning-memory">
              <span className="home-eyebrow">VELA Learning Memory</span>
              <strong>{pulse.learningMemory.recommendation ? `Learned response · ${pulse.learningMemory.recommendation.actionTitle}` : "Prior outcomes found"}</strong>
              <p>{pulse.learningMemory.explanation}</p>
              {pulse.learningMemory.recommendation && <small>{pulse.learningMemory.recommendation.lesson}</small>}
              {pulse.learningMemory.avoidedAction && <small>Avoid repeating · {pulse.learningMemory.avoidedAction.actionTitle}</small>}
            </div>
          )}
          {pulse.interventions?.[0] && (
            <div className="home-intervention-active">
              <span>Latest · {pulse.interventions[0].status}</span>
              <strong>{pulse.interventions[0].title}</strong>
              <small>{pulse.interventions[0].outcomeStatus ?? "Awaiting outcome"}{pulse.interventions[0].outcomeDelta !== null ? ` · ${pulse.interventions[0].outcomeDelta >= 0 ? "+" : ""}${pulse.interventions[0].outcomeDelta} pts` : ""}</small>
            </div>
          )}
        </section>
      )}

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
              <div className="home-panel-label">
                <span>VELA Intelligence</span>
                <span className="home-ai-kind">{pulse?.ai.type === "STRATEGIC_INTERPRETATION" ? "INTERPRETATION" : "OBSERVATION"}</span>
              </div>
              <h2 id="ai-title">{pulse?.ai.title ?? "Strategic insight, not noise."}</h2>
              {pulse?.ai.thesis && <strong className="home-ai-thesis">{pulse.ai.thesis}</strong>}
              <p>{pulse?.ai.body ?? "Add operational evidence for a more specific interpretation."}</p>
              {pulse?.ai && (
                <div className="home-ai-evidence">
                  <span>Focus · {pulse.ai.focus}</span>
                  <span>Confidence · {pulse.ai.confidence}</span>
                  <span>Evidence · {pulse.ai.evidence.length} signals</span>
                </div>
              )}
              {pulse?.ai.tensions?.[0] && <div className="home-ai-tension">Tension · {pulse.ai.tensions[0]}</div>}
            </section>
          </div>

          <div className="home-lower-grid">
            <section className="home-surface-panel" aria-labelledby="trajectory-title">
              <div className="home-section-heading"><div><span className="home-eyebrow">Based on real execution and validation signals</span><h2 id="trajectory-title">Trajectory</h2></div><span className="home-traj-status">{pulse?.trajectory.assessment.status ?? "—"}</span></div>
              {pulse?.trajectory.history.status === "INSUFFICIENT_DATA" ? <DataState status="INSUFFICIENT_DATA" explanation={pulse.trajectory.history.explanation} /> : pulse?.trajectory.history ? <>
                <div className="home-trajectory-summary">
                  <strong>{pulse.trajectory.history.direction}</strong>
                  <span>{pulse.trajectory.history.delta !== null && pulse.trajectory.history.delta >= 0 ? "+" : ""}{pulse.trajectory.history.delta} pts</span>
                  <span>{pulse.trajectory.history.velocityPerDay !== null && pulse.trajectory.history.velocityPerDay >= 0 ? "+" : ""}{pulse.trajectory.history.velocityPerDay} pts/day</span>
                  <span>{pulse.trajectory.history.daysObserved} days observed</span>
                </div>
                <div className="trajectory-real-chart" aria-label="Historical venture pulse">
                  {pulse.trajectory.history.points.slice(-16).map((point) => {
                    const values = [point.velocity, point.validation, point.readiness, point.sprintCompletion, typeof point.risk === "number" ? 100 - point.risk : null].filter((value): value is number => typeof value === "number");
                    const score = values.length >= 2 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
                    return <span key={point.capturedAt} style={{ height: `${Math.max(8, score ?? 8)}%` }} title={new Date(point.capturedAt).toLocaleString()} />;
                  })}
                </div>
                <p className="home-trajectory-explanation">{pulse.trajectory.history.explanation}</p>
                {pulse.trajectory.history.dynamics.status === "AVAILABLE" && (
                  <div className={`home-dynamics home-dynamics-${pulse.trajectory.history.dynamics.state?.toLowerCase() ?? "steady"}`}>
                    <span>Momentum · {pulse.trajectory.history.dynamics.state?.replaceAll("_", " ")}</span>
                    <strong>{pulse.trajectory.history.dynamics.recentVelocityPerDay !== null && pulse.trajectory.history.dynamics.recentVelocityPerDay >= 0 ? "+" : ""}{pulse.trajectory.history.dynamics.recentVelocityPerDay} pts/day recent</strong>
                    <small>{pulse.trajectory.history.dynamics.explanation}</small>
                  </div>
                )}
                {pulse.trajectory.rootCause.status === "AVAILABLE" && pulse.trajectory.rootCause.primary && (
                  <div className="home-root-cause">
                    <div><span>Likely driver</span><strong>{pulse.trajectory.rootCause.primary.label}</strong></div>
                    <div><span>Change</span><strong>{pulse.trajectory.rootCause.primary.delta} pts</strong></div>
                    <div><span>Confidence</span><strong>{pulse.trajectory.rootCause.confidence}</strong></div>
                    <p>{pulse.trajectory.rootCause.explanation}</p>
                    {pulse.trajectory.rootCause.contributors.length > 0 && <small>Following signals · {pulse.trajectory.rootCause.contributors.map((item) => item.label).join(" · ")}</small>}
                  </div>
                )}
                <div className="trajectory-factors">{pulse.trajectory.assessment.factors.slice(0, 3).map((factor) => <span key={factor}>{factor}</span>)}</div>
              </> : <DataState status="INSUFFICIENT_DATA" explanation="VELA is collecting trajectory history." />}
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
