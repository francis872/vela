"use client";

import { useEffect, useState } from "react";

type StaticResource = {
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  href: string;
};

type UserResource = {
  id: string;
  title: string;
  desc: string;
  tag: string;
  url: string | null;
  authorName: string;
  ownerId: string;
  createdAt: string;
};

const TAG_COLOR: Record<string, string> = {
  Framework: "badge-blue",
  Playbook: "badge-green",
  Template: "badge-accent",
  Herramienta: "badge-amber",
  Modelo: "badge-blue",
  Checklist: "badge-ghost",
  Recurso: "badge-ghost",
};

const STATIC_RESOURCES: StaticResource[] = [
  {
    title: "Lean Startup Canvas",
    desc: "Documenta tu hipÃ³tesis de negocio en una sola pÃ¡gina. Problema, soluciÃ³n, mÃ©tricas clave y ventaja diferencial.",
    tag: "Framework",
    tagColor: "badge-blue",
    href: "https://www.strategyzer.com/library/the-lean-canvas",
  },
  {
    title: "Sprint de ValidaciÃ³n 2 semanas",
    desc: "Protocolo de 10 dÃ­as para pasar de hipÃ³tesis a evidencia real con clientes. Incluye guÃ­a de entrevistas y criterio de Ã©xito.",
    tag: "Playbook",
    tagColor: "badge-green",
    href: "https://www.ycombinator.com/library/6g-how-to-talk-to-users",
  },
  {
    title: "Deck de inversiÃ³n â€” Estructura YC",
    desc: "Las 12 diapositivas que cubren: problema, soluciÃ³n, mercado, tracciÃ³n, equipo, ask. Con notas y ejemplos.",
    tag: "Template",
    tagColor: "badge-accent",
    href: "https://www.ycombinator.com/library/2u-how-to-pitch-your-startup",
  },
  {
    title: "Product-Market Fit Score",
    desc: "Calculadora de PMF basada en retenciÃ³n, NPS y crecimiento orgÃ¡nico. Identifica si estÃ¡s listo para escalar.",
    tag: "Herramienta",
    tagColor: "badge-amber",
    href: "https://www.superhuman.com/blog/how-superhuman-built-an-engine-to-find-product-market-fit/",
  },
  {
    title: "Runway & Burn Rate",
    desc: "Modelo financiero bÃ¡sico para calcular cuÃ¡ntos meses te quedan, cuÃ¡ndo levantar capital y cuÃ¡l es tu MRR objetivo.",
    tag: "Modelo",
    tagColor: "badge-blue",
    href: "https://www.ycombinator.com/library/3y-a-guide-to-seed-fundraising",
  },
  {
    title: "OKR Starter Kit",
    desc: "GuÃ­a para definir tus primeros 3 objetivos de ciclo con resultados clave medibles y frecuencia de revisiÃ³n.",
    tag: "Framework",
    tagColor: "badge-green",
    href: "https://www.whatmatters.com/faqs/okr-meaning-definition-example",
  },
  {
    title: "Go-to-Market en 30 dÃ­as",
    desc: "Plan de lanzamiento desde cero: canal, mensaje, audiencia, mÃ©tricas de activaciÃ³n y primer ciclo de feedback.",
    tag: "Playbook",
    tagColor: "badge-accent",
    href: "https://www.ycombinator.com/library/go-to-market",
  },
  {
    title: "Technical Co-founder Checklist",
    desc: "Criterios para evaluar a un CTO o co-fundador tÃ©cnico: stack, cultura, equity, y acuerdos de vesting.",
    tag: "Checklist",
    tagColor: "badge-amber",
    href: "https://www.ycombinator.com/library/6x-how-to-find-the-right-co-founder",
  },
];

const ALL_TAGS = ["Todo", "Framework", "Playbook", "Template", "Herramienta", "Modelo", "Checklist", "Recurso"];

type Props = { userName: string; userRole: string };

export default function SpacePage({ userName, userRole }: Props) {
  const [activeTag, setActiveTag] = useState("Todo");
  const [query, setQuery] = useState("");
  const [userResources, setUserResources] = useState<UserResource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", tag: "Recurso", url: "" });

  useEffect(() => {
    fetch("/api/space/resources").then((r) => r.json()).then(setUserResources).catch(() => {});
  }, []);

  const isAdmin = userRole === "admin";

  const filteredStatic = STATIC_RESOURCES.filter((r) => {
    const matchTag = activeTag === "Todo" || r.tag === activeTag;
    const matchQuery = !query || r.title.toLowerCase().includes(query.toLowerCase()) || r.desc.toLowerCase().includes(query.toLowerCase());
    return matchTag && matchQuery;
  });

  const filteredUser = userResources.filter((r) => {
    const matchTag = activeTag === "Todo" || r.tag === activeTag;
    const matchQuery = !query || r.title.toLowerCase().includes(query.toLowerCase()) || r.desc.toLowerCase().includes(query.toLowerCase());
    return matchTag && matchQuery;
  });

  async function submitResource() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/space/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setUserResources((p) => [created, ...p]);
      setForm({ title: "", desc: "", tag: "Recurso", url: "" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function deleteResource(id: string) {
    await fetch(`/api/space/resources?id=${id}`, { method: "DELETE" });
    setUserResources((p) => p.filter((r) => r.id !== id));
  }

  return (
    <div style={{ padding: "2.5rem 2rem 4rem" }}>
      {/* Header */}
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Space</h1>
          <p className="os-page-sub">Recursos, frameworks y playbooks â€” curados y aportados por la comunidad.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Aportar recurso</button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="os-card" style={{ marginBottom: "1.75rem", border: "1px solid var(--accent)" }}>
          <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "1rem" }}>Nuevo recurso</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <input className="os-input" placeholder="TÃ­tulo del recurso" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="os-input os-textarea" placeholder="DescripciÃ³n breve â€” Â¿quÃ© es y para quÃ© sirve?" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} rows={2} />
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <select className="os-input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} style={{ flex: 1 }}>
                {["Recurso", "Framework", "Playbook", "Template", "Herramienta", "Modelo", "Checklist"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input className="os-input" placeholder="URL (opcional â€” ej: https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={{ flex: 2 }} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn-primary" onClick={submitResource} disabled={saving || !form.title.trim()}>{saving ? "Guardandoâ€¦" : "Publicar"}</button>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        <input className="os-input" placeholder="Buscar recursos..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {ALL_TAGS.map((t) => (
            <button key={t} onClick={() => setActiveTag(t)} className={activeTag === t ? "badge badge-accent" : "badge badge-ghost"} style={{ cursor: "pointer", border: "none", background: activeTag === t ? undefined : "var(--surface-2)" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Community resources */}
      {filteredUser.length > 0 && (
        <>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.75rem" }}>
            Aportados por la comunidad
          </div>
          <div className="os-grid-3" style={{ gap: "1rem", marginBottom: "2rem" }}>
            {filteredUser.map((r) => (
              <div key={r.id} className="os-card os-hover-lift" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderLeft: "3px solid var(--accent)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className={`badge ${TAG_COLOR[r.tag] ?? "badge-ghost"}`}>{r.tag}</span>
                  {(r.authorName === userName || isAdmin) && (
                    <button onClick={() => deleteResource(r.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "var(--ink-3)" }}>Ã—</button>
                  )}
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.35 }}>{r.title}</h3>
                {r.desc && <p style={{ fontSize: "0.82rem", color: "var(--ink-2)", lineHeight: 1.6, flex: 1 }}>{r.desc}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>por {r.authorName}</span>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "0.8rem" }}>Abrir â†’</a>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>Sin enlace</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Curated resources */}
      <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.75rem" }}>
        Biblioteca curada
      </div>
      <div className="os-grid-3" style={{ gap: "1rem" }}>
        {filteredStatic.map((r) => (
          <div key={r.title} className="os-card os-hover-lift" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span className={`badge ${r.tagColor}`}>{r.tag}</span>
            </div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.35 }}>{r.title}</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-2)", lineHeight: 1.6, flex: 1 }}>{r.desc}</p>
            <a href={r.href} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: "0.8rem" }}>
              Abrir recurso â†’
            </a>
          </div>
        ))}
        {filteredStatic.length === 0 && filteredUser.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--ink-3)", padding: "3rem 0" }}>
            No hay recursos que coincidan.
          </div>
        )}
      </div>
    </div>
  );
}
