"use client";

import { useEffect, useRef, useState } from "react";

type Story = {
  founder: string;
  company: string;
  sector: string;
  quote: string;
  milestone: string;
  stage: string;
  stageColor: string;
};

type InspirePost = {
  id: string;
  content: string;
  authorName: string;
  likes: number;
  createdAt: string;
};

const STORIES: Story[] = [
  {
    founder: "Ana Reyes",
    company: "Farma+",
    sector: "Health Tech",
    quote:
      "La claridad que nos dio el ciclo de validación fue la diferencia entre pivotar a tiempo o quedarnos sin runway. Pasamos de 3 hipótesis a 1 modelo probado en 6 semanas.",
    milestone: "PMF alcanzado — 40% retención semana 4",
    stage: "Traction",
    stageColor: "badge-green",
  },
  {
    founder: "Carlos Mendez",
    company: "Logiq",
    sector: "Supply Chain",
    quote:
      "Antes de VELA tomábamos decisiones con intuición. Ahora tenemos señales, tenemos datos, tenemos gates. El proceso disciplinado nos hizo mejores como founders.",
    milestone: "Seed $450K cerrado — 3 inversores",
    stage: "Scale",
    stageColor: "badge-blue",
  },
  {
    founder: "Sofía Castro",
    company: "Greenloop",
    sector: "CleanTech",
    quote:
      "El módulo de Capital me enseñó qué esperan los inversores antes de que yo llegara a una reunión. Llegué preparada. Fue un game changer.",
    milestone: "Primer revenue B2B — $12K MRR",
    stage: "Validation",
    stageColor: "badge-amber",
  },
  {
    founder: "Marcos Silva",
    company: "PayLab",
    sector: "FinTech",
    quote:
      "Construir sin estructura es como navegar sin mapa. Tener objetivos claros, ciclos cortos y señales reales del mercado nos permitió crecer 3x en un trimestre.",
    milestone: "3x crecimiento Q3 — 8K usuarios activos",
    stage: "Traction",
    stageColor: "badge-green",
  },
  {
    founder: "Luciana Park",
    company: "Edunova",
    sector: "EdTech",
    quote:
      "Sabíamos que teníamos algo bueno, pero no sabíamos cómo demostrarlo. La metodología de validación nos dio el lenguaje para hablar con inversores y con clientes.",
    milestone: "Alianza con 2 universidades — 5K estudiantes",
    stage: "Scale",
    stageColor: "badge-blue",
  },
  {
    founder: "Diego Torres",
    company: "Agrilink",
    sector: "AgriTech",
    quote:
      "Dejé un trabajo bien pagado para hacer esto. Hubo momentos duros. Pero cada victoria celebrada con el equipo, cada gate superado, me recordó por qué lo hice.",
    milestone: "Break-even alcanzado — mes 14",
    stage: "Validation",
    stageColor: "badge-amber",
  },
];

const QUOTES = [
  {
    text: "El mejor momento para empezar fue ayer. El segundo mejor momento es ahora.",
    author: "Proverbio emprendedor",
  },
  {
    text: "No fracasas cuando pierdes. Fracasas cuando dejas de intentarlo.",
    author: "Y Combinator Alumni",
  },
  {
    text: "Una startup es la compresión del tiempo. En un año puedes vivir lo que otros tardan una década.",
    author: "Paul Graham",
  },
  {
    text: "Valida antes de construir. Construye antes de escalar. Escala con evidencia.",
    author: "Principio VELA",
  },
];

type Props = { userName: string; userRole: string };

export default function InspirePage({ userName }: Props) {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [posts, setPosts] = useState<InspirePost[]>([]);
  const [postContent, setPostContent] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const todayQuote = QUOTES[new Date().getDay() % QUOTES.length];

  useEffect(() => {
    fetch("/api/inspire/posts").then((r) => r.json()).then(setPosts).catch(() => {});
  }, []);

  async function submitPost() {
    if (!postContent.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/inspire/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: postContent }),
    });
    if (res.ok) {
      const created = await res.json();
      setPosts((p) => [created, ...p]);
      setPostContent("");
      setShowPostForm(false);
    }
    setSaving(false);
  }

  async function likePost(id: string) {
    if (likedIds.has(id)) return;
    setLikedIds((s) => new Set([...s, id]));
    const res = await fetch("/api/inspire/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPosts((p) => p.map((post) => post.id === id ? updated : post));
    }
  }

  async function deletePost(id: string) {
    await fetch(`/api/inspire/posts?id=${id}`, { method: "DELETE" });
    setPosts((p) => p.filter((post) => post.id !== id));
  }

  return (
    <div style={{ padding: "2.5rem 2rem 4rem" }}>
      {/* Header */}
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Inspire</h1>
          <p className="os-page-sub">
            Historias de founders que ejecutaron con estructura y lograron resultados reales.
          </p>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>{userName}</div>
      </div>

      {/* Quote of the day */}
      <div className="os-card-accent" style={{ marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem" }}>
          Reflexión del día
        </div>
        <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.55, fontStyle: "italic" }}>
          &ldquo;{todayQuote.text}&rdquo;
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginTop: "0.5rem" }}>— {todayQuote.author}</p>
      </div>

      {/* Stories grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {STORIES.map((s) => (
          <button
            key={s.company}
            className="os-card os-hover-lift"
            style={{ textAlign: "left", width: "100%", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.75rem" }}
            onClick={() => setActiveStory(activeStory?.company === s.company ? null : s)}
          >
            {/* Top */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>{s.company}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>{s.sector}</div>
              </div>
              <span className={`badge ${s.stageColor}`}>{s.stage}</span>
            </div>

            {/* Quote */}
            <p style={{ fontSize: "0.82rem", color: "var(--ink-2)", lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{s.quote}&rdquo;
            </p>

            {/* Expanded detail */}
            {activeStory?.company === s.company && (
              <div style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "0.75rem",
                display: "flex", flexDirection: "column", gap: "0.4rem",
              }}>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>Founder</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)" }}>{s.founder}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-3)", marginTop: "0.4rem" }}>Hito alcanzado</div>
                <div style={{ fontSize: "0.85rem", color: "var(--green)", fontWeight: 600 }}>✓ {s.milestone}</div>
              </div>
            )}

            <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", alignSelf: "flex-end" }}>
              {activeStory?.company === s.company ? "Cerrar ↑" : "Ver historia →"}
            </div>
          </button>
        ))}
      </div>

      {/* Community posts */}
      <div className="os-divider" style={{ margin: "3rem 0 2rem" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.2rem" }}>Voz de la comunidad</div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>Comparte lo que te mueve. Una frase, una lección, una victoria.</div>
        </div>
        <button className="btn-primary" onClick={() => { setShowPostForm(true); setTimeout(() => textareaRef.current?.focus(), 50); }}>
          + Compartir
        </button>
      </div>

      {showPostForm && (
        <div className="os-card" style={{ marginBottom: "1.25rem", border: "1px solid var(--accent)" }}>
          <textarea
            ref={textareaRef}
            className="os-input os-textarea"
            placeholder="Escribe algo que inspire a otro founder... una frase, una lección aprendida, una victoria del día."
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            rows={3}
            maxLength={500}
            style={{ marginBottom: "0.75rem" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>{postContent.length}/500</span>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn-ghost" onClick={() => setShowPostForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={submitPost} disabled={saving || !postContent.trim()}>
                {saving ? "Publicando…" : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {posts.length === 0 && (
          <div className="os-card" style={{ textAlign: "center", padding: "2rem", color: "var(--ink-3)" }}>
            Sé el primero en compartir algo que inspire a la comunidad.
          </div>
        )}
        {posts.map((post) => (
          <div key={post.id} className="os-card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <p style={{ fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.65 }}>{post.content}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
                {post.authorName} · {new Date(post.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
              </span>
              <button
                onClick={() => likePost(post.id)}
                style={{
                  background: "none", border: "none", cursor: likedIds.has(post.id) ? "default" : "pointer",
                  fontSize: "0.78rem", color: likedIds.has(post.id) ? "var(--accent)" : "var(--ink-3)",
                  display: "flex", alignItems: "center", gap: "0.3rem",
                }}
              >
                ♥ {post.likes}
              </button>
              {post.authorName === userName && (
                <button onClick={() => deletePost(post.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--ink-3)" }}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Milestone strip */}
      <div className="os-divider" style={{ margin: "3rem 0 2rem" }} />
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          En números — Ecosistema VELA
        </span>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { value: "38+", label: "Startups activas" },
          { value: "$2.1M", label: "Capital levantado" },
          { value: "12", label: "Exits exitosos" },
          { value: "94%", label: "Tasa de supervivencia año 1" },
        ].map((stat) => (
          <div key={stat.label} className="os-card-sm" style={{ textAlign: "center", minWidth: 120 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: "0.4rem" }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
