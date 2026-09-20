"use client";

import { useEffect, useState } from "react";
import PlatformGraphView from "@/app/relay/platform-graph-view";

type NetworkIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  need: {
    kind: string;
    title: string;
    explanation: string;
    relationType: "collaborate" | "mentor";
    source: string;
  };
  recommendation: {
    id: string;
    name: string;
    role: string;
    position: string | null;
    headline: string | null;
    availability: string | null;
    skills: string[];
    score: number;
    reasons: string[];
  } | null;
  alternatives: {
    id: string;
    name: string;
    role: string;
    position: string | null;
    skills: string[];
    score: number;
  }[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
};

export default function NetworkWorkspace({ currentUserId, userName }: { currentUserId: string; userName: string }) {
  const [intelligence, setIntelligence] = useState<NetworkIntelligence | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    const response = await fetch("/api/network/intelligence", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      setIntelligence(payload.intelligence ?? null);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stream = new EventSource("/api/home/events");
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(); setRefreshKey((key) => key + 1); }, 250);
    };
    stream.addEventListener("domain-event", refresh);
    return () => { if (timer) clearTimeout(timer); stream.close(); };
  }, []);

  async function connectRecommendation() {
    if (!intelligence?.recommendation) return;
    setConnecting(true);
    try {
      const response = await fetch("/api/platform/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: intelligence.recommendation.id,
          type: intelligence.need.relationType,
        }),
      });
      if (response.ok) {
        await load();
        setRefreshKey((key) => key + 1);
      }
    } finally {
      setConnecting(false);
    }
  }

  const recommendation = intelligence?.recommendation;

  return (
    <div className="network-shell">
      <header className="network-context">
        <div>
          <span className="home-eyebrow">Relationship system</span>
          <h1>Network</h1>
          <p>Turn operating constraints into relevant collaboration paths using real profiles, declared capabilities and venture evidence.</p>
        </div>
        <div className="network-context-meta">
          <span className="home-eyebrow">Operator</span>
          <strong>{userName}</strong>
          <small>{intelligence?.need.title ?? "Evaluating network need"}</small>
        </div>
      </header>

      <section className={`network-command network-command-${(intelligence?.status ?? "SETUP").toLowerCase()}`}>
        <div className="network-command-rail">
          <span className="home-eyebrow">Network Intelligence</span>
          <span className="network-command-status">{intelligence?.status ?? "SETUP"}</span>
        </div>
        <div>
          <span className="network-command-kicker">{intelligence?.need.kind ?? "Capability need"}</span>
          <h2>{intelligence?.title ?? "Map the next useful relationship."}</h2>
          <p>{intelligence?.explanation ?? "VELA is evaluating venture needs against available network capabilities."}</p>
        </div>
        <div className="network-command-action">
          {recommendation ? (
            <button className="btn-primary" onClick={connectRecommendation} disabled={connecting}>
              {connecting ? "Connecting…" : `${intelligence?.need.relationType === "mentor" ? "Request mentor path" : "Create collaboration"} →`}
            </button>
          ) : (
            <a className="btn-primary" href="/profile">Complete profile <span aria-hidden="true">→</span></a>
          )}
          <small>{intelligence?.confidence ?? "LOW"} confidence · capability match</small>
        </div>
      </section>

      <section className="network-intelligence-strip">
        <NetworkStat label="Current need" value={intelligence?.need.kind ?? "—"} note={intelligence?.need.source ?? "insufficient evidence"} />
        <NetworkStat label="Best match" value={recommendation?.name ?? "—"} note={recommendation?.position ?? "no candidate yet"} />
        <NetworkStat label="Match score" value={recommendation?.score ?? "—"} note="heuristic relevance" />
        <NetworkStat label="Alternatives" value={intelligence?.alternatives.length ?? 0} note="additional profiles" />
      </section>

      {recommendation && (
        <section className="network-match">
          <div>
            <span className="home-eyebrow">Recommended relationship</span>
            <h2>{recommendation.name}</h2>
            <p>{recommendation.headline ?? recommendation.position ?? recommendation.role}</p>
          </div>
          <div className="network-match-evidence">
            <span>{intelligence?.need.relationType}</span>
            {recommendation.skills.slice(0, 5).map((skill) => <span key={skill}>{skill}</span>)}
            {recommendation.reasons.slice(0, 3).map((reason) => <small key={reason}>{reason}</small>)}
          </div>
        </section>
      )}

      <section className="network-graph-section">
        <div className="home-section-heading">
          <div><span className="home-eyebrow">Relationship map</span><h2>Network Graph</h2></div>
          <small>People · connections · VELA activity</small>
        </div>
        <PlatformGraphView key={refreshKey} currentUserId={currentUserId} />
      </section>
    </div>
  );
}

function NetworkStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="network-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
