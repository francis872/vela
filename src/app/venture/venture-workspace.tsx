"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type VenturePayload = {
  venture: {
    id: string; name: string; sector: string; stage: string; description: string | null;
    yearsOperating: number; teamSize: number; customers: string | null;
    monthlyRevenue: number | null; monthlyCosts: number | null;
  } | null;
  diagnostic: { status: string; maturityScore: number | null } | null;
  intelligence: {
    status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
    title: string; explanation: string; focus: string;
    action: { label: string; href: string };
    confidence: "LOW" | "MEDIUM" | "HIGH";
    operating: {
      objectiveCompletion: number | null; validationCoverage: number | null;
      sprintCompletion: number | null; gateProgress: number | null; operatingMargin: number | null;
    };
  };
};

export default function VentureWorkspace({ userName }: { userName: string }) {
  const [data, setData] = useState<VenturePayload | null>(null);

  async function load() {
    const response = await fetch("/api/venture/intelligence", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }

  useEffect(() => { void load(); }, []);
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

  const venture = data?.venture;
  const intel = data?.intelligence;
  const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return (
    <div className="venture-shell">
      <header className="venture-context">
        <div>
          <span className="home-eyebrow">Venture system</span>
          <h1>{venture?.name ?? "Venture"}</h1>
          <p>{venture?.description ?? "Define the business context that anchors Build, Validate, Engine, Capital, Network and Relay."}</p>
        </div>
        <div className="venture-context-meta">
          <span className="home-eyebrow">Founder</span>
          <strong>{userName}</strong>
          <small>{venture ? `${venture.sector} · ${venture.stage}` : "No venture configured"}</small>
        </div>
      </header>

      <section className={`venture-command venture-command-${(intel?.status ?? "SETUP").toLowerCase()}`}>
        <div className="venture-command-rail">
          <span className="home-eyebrow">Venture Intelligence</span>
          <span className="venture-command-status">{intel?.status ?? "SETUP"}</span>
        </div>
        <div>
          <span className="venture-command-kicker">{intel?.focus ?? "Venture setup"}</span>
          <h2>{intel?.title ?? "Establish the venture operating baseline."}</h2>
          <p>{intel?.explanation ?? "VELA is evaluating venture context and operating evidence."}</p>
        </div>
        <div className="venture-command-action">
          <Link className="btn-primary" href={intel?.action.href ?? "/app/ventures/new"}>
            {intel?.action.label ?? "Create venture"} <span aria-hidden="true">→</span>
          </Link>
          <small>{intel?.confidence ?? "LOW"} confidence · persisted venture evidence</small>
        </div>
      </section>

      <section className="venture-intelligence-strip">
        <VentureStat label="Objectives" value={pct(intel?.operating.objectiveCompletion)} note="completion" />
        <VentureStat label="Validation" value={pct(intel?.operating.validationCoverage)} note="evidence coverage" />
        <VentureStat label="Sprints" value={pct(intel?.operating.sprintCompletion)} note="completed cycles" />
        <VentureStat label="Readiness" value={pct(intel?.operating.gateProgress)} note="passed gates" />
      </section>

      {venture ? (
        <>
          <section className="venture-profile-grid">
            <article className="venture-profile-main">
              <span className="home-eyebrow">Business identity</span>
              <h2>{venture.name}</h2>
              <p>{venture.description || "Description not provided."}</p>
              <div className="venture-tags"><span>{venture.sector}</span><span>{venture.stage}</span><span>{venture.teamSize} team</span><span>{venture.yearsOperating} years</span></div>
            </article>
            <article className="venture-profile-panel">
              <span className="home-eyebrow">Customer context</span>
              <p>{venture.customers || "Customer context has not been documented."}</p>
            </article>
          </section>

          <section className="venture-economics">
            <VentureStat label="Monthly revenue" value={money(venture.monthlyRevenue)} note="persisted value" />
            <VentureStat label="Monthly costs" value={money(venture.monthlyCosts)} note="persisted value" />
            <VentureStat label="Operating margin" value={pct(intel?.operating.operatingMargin)} note="revenue minus costs" />
            <VentureStat label="Diagnostic maturity" value={pct(data?.diagnostic?.maturityScore)} note={data?.diagnostic?.status ?? "not assessed"} />
          </section>

          <section className="venture-system-map">
            <div className="home-section-heading"><div><span className="home-eyebrow">Operating map</span><h2>Venture → execution system</h2></div></div>
            <div className="venture-module-grid">
              {[
                ["Build","Objectives & dependencies","/build"],
                ["Validate","Evidence & learning","/validate"],
                ["Engine","Execution cadence","/engine"],
                ["Capital","Readiness gates","/capital"],
                ["Network","Capability paths","/network"],
                ["Relay","Collaboration & decisions","/relay"],
              ].map(([label,note,href]) => <Link key={label} href={href} className="venture-module-link"><strong>{label}</strong><span>{note}</span><b>→</b></Link>)}
            </div>
          </section>
        </>
      ) : (
        <section className="venture-empty">
          <span className="home-eyebrow">Source of truth</span>
          <h2>Your operating system needs a venture.</h2>
          <p>Create the business record first. VELA will then use it as shared context across the operating modules.</p>
          <Link className="btn-primary" href="/app/ventures/new">Create venture →</Link>
        </section>
      )}
    </div>
  );
}

function pct(value: number | null | undefined) { return value == null ? "—" : `${value}%`; }
function VentureStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="venture-stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
