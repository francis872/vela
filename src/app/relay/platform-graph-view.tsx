"use client";

import { useEffect, useState } from "react";

type PNodeType = "user" | "tool" | "platform";
type SocialType = "follow" | "collaborate" | "mentor";

interface PNode {
  id: string;
  type: PNodeType;
  label: string;
  role?: string;
}

interface PEdge {
  from: string;
  to: string;
  type: "social" | "usage" | "co_usage";
  weight: number;
  subtype?: SocialType;
}

interface NodeMetrics {
  id: string;
  label: string;
  type: PNodeType;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  weightedDegree: number;
  pageRank: number;
  community: number;
  isBridge: boolean;
}

interface PlatformAnalysis {
  metrics: NodeMetrics[];
  topInfluencers: string[];
  topTools: string[];
  bridgeUsers: string[];
  communities: Record<number, string[]>;
  coUsagePairs: Array<{ a: string; b: string; count: number }>;
  density: number;
  connectedUsers: number;
  orphanTools: string[];
}

interface ConnectUser {
  id: string;
  name: string;
  role: string;
  position?: string | null;
}

interface Connection {
  id: string;
  type: SocialType;
  fromUser: ConnectUser;
  toUser: ConnectUser;
}

const COMMUNITY_COLORS = [
  "var(--blue)", "var(--green)", "var(--amber)", "var(--accent)", "var(--red)",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899",
];

const TYPE_COLOR: Record<PNodeType, string> = {
  user:     "var(--accent)",
  tool:     "var(--blue)",
  platform: "var(--green)",
};

const CONN_LABEL: Record<SocialType, string> = {
  follow:      "Seguir",
  collaborate: "Colaborar",
  mentor:      "Mentor",
};

export default function PlatformGraphView({ currentUserId }: { currentUserId: string }) {
  const [nodes, setNodes]       = useState<PNode[]>([]);
  const [edges, setEdges]       = useState<PEdge[]>([]);
  const [analysis, setAnalysis] = useState<PlatformAnalysis | null>(null);
  const [loading, setLoading]   = useState(true);

  const [connections, setConnections]   = useState<Connection[]>([]);
  const [allUsers, setAllUsers]         = useState<ConnectUser[]>([]);
  const [connTarget, setConnTarget]     = useState("");
  const [connType, setConnType]         = useState<SocialType>("follow");
  const [connSaving, setConnSaving]     = useState(false);
  const [connError, setConnError]       = useState("");

  const [filter, setFilter] = useState<PNodeType | "all">("all");

  async function load() {
    setLoading(true);
    const [gRes, cRes] = await Promise.all([
      fetch("/api/platform/graph"),
      fetch("/api/platform/connect"),
    ]);
    if (gRes.ok) {
      const d = await gRes.json();
      setNodes(d.nodes ?? []);
      setEdges(d.edges ?? []);
      setAnalysis(d.analysis ?? null);
    }
    if (cRes.ok) {
      const d = await cRes.json();
      setConnections(d.connections ?? []);
      setAllUsers(d.allUsers ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addConnection() {
    if (!connTarget) return;
    setConnSaving(true);
    setConnError("");
    const res = await fetch("/api/platform/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: connTarget, type: connType }),
    });
    if (!res.ok) {
      const d = await res.json();
      setConnError(d.error ?? "Error al conectar");
    } else {
      setConnTarget(""); await load();
    }
    setConnSaving(false);
  }

  async function removeConnection(toUserId: string) {
    await fetch(`/api/platform/connect?toUserId=${toUserId}`, { method: "DELETE" });
    await load();
  }

  // ── Layout: force-inspired layered positions ──────────────────────────────
  const positions: Record<string, { x: number; y: number }> = {};
  const userNodes   = nodes.filter((n) => n.type === "user");
  const toolNodes   = nodes.filter((n) => n.type === "tool");
  const platNode    = nodes.find((n) => n.type === "platform");

  const R_USER = 160;
  const R_TOOL = 290;

  // Users arranged in a circle
  userNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / (userNodes.length || 1) - Math.PI / 2;
    positions[n.id] = { x: 340 + R_USER * Math.cos(angle), y: 280 + R_USER * Math.sin(angle) };
  });

  // Tools in outer ring
  toolNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / (toolNodes.length || 1) - Math.PI / 2;
    positions[n.id] = { x: 340 + R_TOOL * Math.cos(angle), y: 280 + R_TOOL * Math.sin(angle) };
  });

  // Platform at center
  if (platNode) positions[platNode.id] = { x: 340, y: 280 };

  const svgW = 680, svgH = 560;

  const metricsMap = new Map(analysis?.metrics.map((m) => [m.id, m]) ?? []);
  const topInfluencers = new Set(analysis?.topInfluencers ?? []);
  const bridges = new Set(analysis?.bridgeUsers ?? []);
  const myConnectedIds = new Set(
    connections.map((c) =>
      c.fromUser.id === currentUserId ? c.toUser.id : c.fromUser.id
    )
  );

  const visibleNodes = filter === "all" ? nodes : nodes.filter((n) => n.type === filter);
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  if (loading) {
    return <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--ink-3)" }}>Cargando grafo de plataforma…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.5rem 2.5rem" }}>

      {/* ── Stats header ── */}
      {analysis && (
        <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
          {[
            { label: "Usuarios en red", value: analysis.connectedUsers, color: "var(--accent)" },
            { label: "Comunidades", value: Object.keys(analysis.communities).length, color: "var(--blue)" },
            { label: "Densidad", value: `${(analysis.density * 100).toFixed(1)}%`, color: "var(--green)" },
            { label: "Usuarios puente", value: analysis.bridgeUsers.length, color: "var(--amber)" },
          ].map((s) => (
            <div key={s.label} className="os-card" style={{ flex: "1 1 120px", textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter ── */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {(["all", "user", "tool", "platform"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? "btn-primary" : "btn-ghost"}
            style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem" }}
          >
            {f === "all" ? "Todo" : f === "user" ? "Usuarios" : f === "tool" ? "Herramientas" : "Plataforma"}
          </button>
        ))}
      </div>

      {/* ── SVG Graph ── */}
      <div style={{ background: "var(--surface)", borderRadius: "0.875rem", border: "1px solid var(--border)", overflow: "auto" }}>
        <svg width={svgW} height={svgH} style={{ display: "block" }}>
          <defs>
            <marker id="pg-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="var(--ink-3)" />
            </marker>
            <marker id="pg-arrow-social" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="var(--accent)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) return null;
            const from = positions[e.from];
            const to   = positions[e.to];
            if (!from || !to) return null;

            const isSocial   = e.type === "social";
            const isUsage    = e.type === "usage";
            const isCoUsage  = e.type === "co_usage";
            const stroke = isSocial ? "var(--accent)" : isUsage ? "var(--blue)" : "var(--ink-3)";
            const opacity = isSocial ? 0.8 : isUsage ? 0.4 : 0.2;
            const dash = isCoUsage ? "4 3" : "none";
            const strokeW = isSocial ? 2 : isUsage ? Math.min(1 + e.weight * 0.3, 4) : 1;

            return (
              <line
                key={i}
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke={stroke}
                strokeWidth={strokeW}
                strokeDasharray={dash}
                opacity={opacity}
                markerEnd={isSocial ? "url(#pg-arrow-social)" : "url(#pg-arrow)"}
              />
            );
          })}

          {/* Nodes */}
          {visibleNodes.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            const m = metricsMap.get(n.id);
            const isInfluencer = topInfluencers.has(n.id);
            const isBridge = bridges.has(n.id);
            const commColor = m ? COMMUNITY_COLORS[m.community % COMMUNITY_COLORS.length] : TYPE_COLOR[n.type];
            const r = n.type === "platform" ? 22 : n.type === "tool" ? 14 : Math.max(10, 10 + (m?.pageRank ?? 0) * 200);

            return (
              <g key={n.id}>
                {/* Glow for influencers */}
                {isInfluencer && (
                  <circle cx={p.x} cy={p.y} r={r + 6} fill={commColor} opacity={0.15} />
                )}
                {/* Bridge ring */}
                {isBridge && (
                  <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke="var(--amber)" strokeWidth={2} strokeDasharray="3 2" />
                )}
                <circle
                  cx={p.x} cy={p.y} r={r}
                  fill={commColor}
                  opacity={0.9}
                  stroke={isInfluencer ? "var(--ink)" : "var(--surface)"}
                  strokeWidth={isInfluencer ? 2 : 1}
                />
                {/* Label */}
                <text
                  x={p.x}
                  y={p.y + r + 13}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="var(--ink-2)"
                  style={{ fontFamily: "inherit", pointerEvents: "none" }}
                >
                  {n.label.length > 14 ? n.label.slice(0, 14) + "…" : n.label}
                </text>
                {m && m.weightedDegree > 0 && (
                  <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={8} fill="white" fontWeight={700} style={{ pointerEvents: "none" }}>
                    {m.weightedDegree}
                  </text>
                )}
                <title>
                  {n.label}
                  {m ? `\nPR: ${m.pageRank.toFixed(4)}\nConexiones: ${m.totalDegree}\nComunidad: ${m.community}` : ""}
                  {isInfluencer ? "\n★ Top influencer" : ""}
                  {isBridge ? "\n⚡ Usuario puente" : ""}
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.78rem", color: "var(--ink-3)" }}>
        <span><span style={{ color: "var(--accent)" }}>—</span> Conexión social</span>
        <span><span style={{ color: "var(--blue)" }}>—</span> Uso de herramienta</span>
        <span><span style={{ color: "var(--ink-3)" }}>- -</span> Co-uso</span>
        <span>Tamaño = influencia (PageRank)</span>
        <span>Color = comunidad</span>
        <span>Anillo ámbar = usuario puente</span>
      </div>

      {/* ── Insights panels ── */}
      {analysis && (
        <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>

          {/* Top influencers */}
          {analysis.topInfluencers.length > 0 && (
            <div className="os-card" style={{ flex: "1 1 200px", borderLeft: "3px solid var(--accent)" }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "0.8rem", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Top influencers
              </div>
              {analysis.topInfluencers.map((id, i) => {
                const m = metricsMap.get(id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.7rem" }}>{i + 1}.</span>
                    <span style={{ color: "var(--ink-2)" }}>{m?.label}</span>
                    <span style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: "0.72rem" }}>{m?.pageRank.toFixed(4)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top tools */}
          {analysis.topTools.length > 0 && (
            <div className="os-card" style={{ flex: "1 1 200px", borderLeft: "3px solid var(--blue)" }}>
              <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: "0.8rem", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Herramientas top
              </div>
              {analysis.topTools.map((id, i) => {
                const m = metricsMap.get(id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--blue)", fontWeight: 700, fontSize: "0.7rem" }}>{i + 1}.</span>
                    <span style={{ color: "var(--ink-2)" }}>{m?.label}</span>
                    <span style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: "0.72rem" }}>×{m?.weightedDegree}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Co-usage pairs */}
          {analysis.coUsagePairs.length > 0 && (
            <div className="os-card" style={{ flex: "1 1 220px", borderLeft: "3px solid var(--green)" }}>
              <div style={{ fontWeight: 700, color: "var(--green)", fontSize: "0.8rem", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Siempre juntos
              </div>
              {analysis.coUsagePairs.slice(0, 5).map((pair, i) => {
                const la = metricsMap.get(pair.a)?.label ?? pair.a;
                const lb = metricsMap.get(pair.b)?.label ?? pair.b;
                return (
                  <div key={i} style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginBottom: "0.3rem" }}>
                    <span style={{ color: "var(--ink-2)" }}>{la}</span>
                    <span style={{ color: "var(--green)" }}> + </span>
                    <span style={{ color: "var(--ink-2)" }}>{lb}</span>
                    <span style={{ float: "right", color: "var(--green)", fontWeight: 700 }}>×{pair.count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bridge users */}
          {analysis.bridgeUsers.length > 0 && (
            <div className="os-card" style={{ flex: "1 1 200px", borderLeft: "3px solid var(--amber)" }}>
              <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: "0.8rem", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Usuarios puente
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                Si se van, la red se fragmenta.
              </p>
              {analysis.bridgeUsers.map((id) => (
                <div key={id} style={{ fontSize: "0.82rem", color: "var(--ink-2)", marginBottom: "0.2rem" }}>
                  ⚡ {metricsMap.get(id)?.label}
                </div>
              ))}
            </div>
          )}

          {/* Orphan tools */}
          {analysis.orphanTools.length > 0 && (
            <div className="os-card" style={{ flex: "1 1 200px", borderLeft: "3px solid var(--red)" }}>
              <div style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.8rem", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Sin adopción
              </div>
              {analysis.orphanTools.map((id) => (
                <div key={id} style={{ fontSize: "0.82rem", color: "var(--ink-2)", marginBottom: "0.2rem" }}>
                  ○ {metricsMap.get(id)?.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Connection manager ── */}
      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>

        {/* Add connection */}
        {allUsers.length > 0 && (
          <div className="os-card" style={{ flex: "1 1 300px" }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)", marginBottom: "0.875rem" }}>
              Conectar con alguien
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <select className="os-input" style={{ flex: 2 }} value={connTarget} onChange={(e) => setConnTarget(e.target.value)}>
                  <option value="">Selecciona un usuario…</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}{u.position ? ` — ${u.position}` : ""}
                    </option>
                  ))}
                </select>
                <select className="os-input" style={{ flex: 1 }} value={connType} onChange={(e) => setConnType(e.target.value as SocialType)}>
                  <option value="follow">Seguir</option>
                  <option value="collaborate">Colaborar</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>
              {connError && <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>{connError}</p>}
              <button
                className="btn-primary"
                onClick={addConnection}
                disabled={!connTarget || connSaving}
                style={{ alignSelf: "flex-start" }}
              >
                {connSaving ? "Guardando…" : "Conectar"}
              </button>
            </div>
          </div>
        )}

        {/* Existing connections */}
        {connections.length > 0 && (
          <div className="os-card" style={{ flex: "1 1 300px" }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)", marginBottom: "0.875rem" }}>
              Mis conexiones ({connections.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {connections.map((c) => {
                const other = c.fromUser.id === currentUserId ? c.toUser : c.fromUser;
                const isOutgoing = c.fromUser.id === currentUserId;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--ink-3)", fontSize: "0.7rem" }}>{isOutgoing ? "→" : "←"}</span>
                    <span style={{ flex: 1, color: "var(--ink-2)" }}>{other.name}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--accent)", background: "var(--surface-2)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem" }}>
                      {CONN_LABEL[c.type]}
                    </span>
                    {isOutgoing && (
                      <button
                        onClick={() => removeConnection(other.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: "0.72rem" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
