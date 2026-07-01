"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type NodeStatus = "on_track" | "at_risk" | "blocked" | "completed";

interface GNode {
  id: string;
  label: string;
  status: NodeStatus;
  priority: number;
}

interface GEdge {
  from: string; // depends on 'to'
  to: string;
}

interface Analysis {
  topologicalOrder: string[];
  hasCycle: boolean;
  cycleEdges: GEdge[];
  criticalPath: string[];
  blockingFactor: Record<string, number>;
  riskCascade: Record<string, string[]>;
  roots: string[];
  leaves: string[];
}

const STATUS_COLOR: Record<NodeStatus, string> = {
  on_track:  "var(--green)",
  at_risk:   "var(--amber)",
  blocked:   "var(--red)",
  completed: "var(--ink-3)",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  on_track:  "En Curso",
  at_risk:   "En Riesgo",
  blocked:   "Bloqueado",
  completed: "Completado",
};

export default function GraphView() {
  const [nodes, setNodes]       = useState<GNode[]>([]);
  const [edges, setEdges]       = useState<GEdge[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [addFrom, setAddFrom]   = useState("");
  const [addTo, setAddTo]       = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/objectives/graph");
    if (res.ok) {
      const data = await res.json();
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setAnalysis(data.analysis ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addEdge() {
    if (!addFrom || !addTo) return;
    setAddSaving(true);
    setAddError("");
    const res = await fetch("/api/objectives/graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectiveId: addFrom, dependsOnId: addTo }),
    });
    if (!res.ok) {
      const d = await res.json();
      setAddError(d.error ?? "Error al agregar dependencia");
    } else {
      setAddFrom(""); setAddTo("");
      await load();
    }
    setAddSaving(false);
  }

  async function removeEdge(from: string, to: string) {
    await fetch(`/api/objectives/graph?objectiveId=${from}&dependsOnId=${to}`, { method: "DELETE" });
    await load();
  }

  // ── Layout computation ──────────────────────────────────────────────────────
  // Assign each node a layer based on topological order
  const positions = useCallback(() => {
    if (!analysis || nodes.length === 0) return {} as Record<string, { x: number; y: number }>;

    const topo = analysis.topologicalOrder.length > 0
      ? analysis.topologicalOrder
      : nodes.map((n) => n.id);

    // Compute layer = max distance from any root
    const layer: Record<string, number> = {};
    const predecessors: Record<string, string[]> = {};
    for (const n of nodes) predecessors[n.id] = [];
    for (const e of edges) predecessors[e.from].push(e.to);

    for (const id of topo) {
      const preds = predecessors[id] ?? [];
      layer[id] = preds.length === 0 ? 0 : Math.max(...preds.map((p) => (layer[p] ?? 0) + 1));
    }

    // Group by layer
    const byLayer: Record<number, string[]> = {};
    for (const [id, l] of Object.entries(layer)) {
      byLayer[l] = byLayer[l] ?? [];
      byLayer[l].push(id);
    }

    const NODE_W = 180, NODE_H = 56, H_GAP = 60, V_GAP = 20;
    const pos: Record<string, { x: number; y: number }> = {};

    const maxLayer = Math.max(...Object.keys(byLayer).map(Number));
    for (let l = 0; l <= maxLayer; l++) {
      const ids = byLayer[l] ?? [];
      ids.forEach((id, i) => {
        pos[id] = {
          x: l * (NODE_W + H_GAP),
          y: i * (NODE_H + V_GAP),
        };
      });
    }

    return pos;
  }, [nodes, edges, analysis]);

  const pos = positions();

  // SVG canvas size
  const allX = Object.values(pos).map((p) => p.x);
  const allY = Object.values(pos).map((p) => p.y);
  const svgW = (allX.length > 0 ? Math.max(...allX) + 200 : 400) + 40;
  const svgH = (allY.length > 0 ? Math.max(...allY) + 70 : 200) + 40;

  const isCritical = new Set(analysis?.criticalPath ?? []);
  const isCycleEdge = (from: string, to: string) =>
    analysis?.cycleEdges.some((e) => e.from === from && e.to === to) ?? false;

  const NODE_W = 180, NODE_H = 56;

  if (loading) {
    return (
      <div style={{ padding: "2.5rem", color: "var(--ink-3)", textAlign: "center" }}>
        Cargando grafo…
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="os-card" style={{ margin: "2.5rem", padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--ink-3)", marginBottom: "0.75rem" }}>
          Crea objetivos primero para visualizar su grafo de dependencias.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Analysis panel ── */}
      {analysis && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>

          {/* Cycle warning */}
          {analysis.hasCycle && (
            <div className="os-card" style={{ flex: "1 1 240px", borderLeft: "3px solid var(--red)" }}>
              <div style={{ fontWeight: 700, color: "var(--red)", marginBottom: "0.4rem" }}>⚠ Ciclo detectado</div>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-3)" }}>
                Hay dependencias circulares. Elimina los enlaces marcados en rojo para resolver el grafo.
              </p>
            </div>
          )}

          {/* Critical path */}
          {analysis.criticalPath.length > 0 && (
            <div className="os-card" style={{ flex: "1 1 280px", borderLeft: "3px solid var(--accent)" }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem", fontSize: "0.82rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Camino crítico ({analysis.criticalPath.length} nodos)
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.25rem" }}>
                {analysis.criticalPath.map((id, i) => {
                  const n = nodes.find((n) => n.id === id);
                  return (
                    <span key={id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-2)", background: "var(--surface-2)", padding: "0.2rem 0.5rem", borderRadius: "0.3rem" }}>
                        {n?.label ?? id}
                      </span>
                      {i < analysis.criticalPath.length - 1 && (
                        <span style={{ color: "var(--accent)" }}>→</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Risk cascade */}
          {Object.keys(analysis.riskCascade).length > 0 && (
            <div className="os-card" style={{ flex: "1 1 240px", borderLeft: "3px solid var(--amber)" }}>
              <div style={{ fontWeight: 700, color: "var(--amber)", marginBottom: "0.5rem", fontSize: "0.82rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Cascada de riesgo
              </div>
              {Object.entries(analysis.riskCascade).map(([id, affected]) => {
                const n = nodes.find((n) => n.id === id);
                return (
                  <div key={id} style={{ fontSize: "0.8rem", color: "var(--ink-3)", marginBottom: "0.25rem" }}>
                    <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{n?.label}</span>
                    {" → "}bloquea {affected.length} objetivo{affected.length !== 1 ? "s" : ""}
                  </div>
                );
              })}
            </div>
          )}

          {/* Top blockers */}
          {(() => {
            const sorted = Object.entries(analysis.blockingFactor)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            if (sorted.length === 0) return null;
            return (
              <div className="os-card" style={{ flex: "1 1 200px", borderLeft: "3px solid var(--blue)" }}>
                <div style={{ fontWeight: 700, color: "var(--blue)", marginBottom: "0.5rem", fontSize: "0.82rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Hubs críticos
                </div>
                {sorted.map(([id, factor]) => {
                  const n = nodes.find((n) => n.id === id);
                  return (
                    <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                      <span style={{ color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "0.5rem" }}>
                        {n?.label}
                      </span>
                      <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>×{factor}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SVG Graph ── */}
      <div style={{ background: "var(--surface)", borderRadius: "0.875rem", border: "1px solid var(--border)", overflow: "auto" }}>
        <svg ref={svgRef} width={svgW} height={svgH} style={{ display: "block", minWidth: "100%" }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--ink-3)" />
            </marker>
            <marker id="arrow-critical" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--accent)" />
            </marker>
            <marker id="arrow-cycle" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--red)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const from = pos[e.from];
            const to   = pos[e.to];
            if (!from || !to) return null;

            const x1 = from.x + 20;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x + NODE_W - 8;
            const y2 = to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;

            const critical = isCritical.has(e.from) && isCritical.has(e.to);
            const cycle    = isCycleEdge(e.from, e.to);
            const stroke   = cycle ? "var(--red)" : critical ? "var(--accent)" : "var(--ink-3)";
            const marker   = cycle ? "url(#arrow-cycle)" : critical ? "url(#arrow-critical)" : "url(#arrow)";
            const opacity  = cycle ? 1 : critical ? 1 : 0.4;

            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={critical ? 2 : 1.5}
                  strokeDasharray={cycle ? "4 3" : "none"}
                  markerEnd={marker}
                  opacity={opacity}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const p = pos[n.id];
            if (!p) return null;
            const critical = isCritical.has(n.id);
            const color = STATUS_COLOR[n.status];
            const borderColor = critical ? "var(--accent)" : "var(--border)";

            return (
              <g key={n.id} transform={`translate(${p.x + 20},${p.y + 20})`}>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  ry={8}
                  fill="var(--surface-2)"
                  stroke={borderColor}
                  strokeWidth={critical ? 2 : 1}
                />
                {/* Status indicator bar */}
                <rect width={4} height={NODE_H} rx={2} ry={2} fill={color} />
                {/* Label */}
                <text
                  x={14}
                  y={22}
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--ink)"
                  style={{ fontFamily: "inherit" }}
                >
                  <title>{n.label}</title>
                  {n.label.length > 22 ? n.label.slice(0, 22) + "…" : n.label}
                </text>
                {/* Status label */}
                <text x={14} y={38} fontSize={9.5} fill={color} style={{ fontFamily: "inherit" }}>
                  {STATUS_LABEL[n.status]}
                  {(analysis?.blockingFactor[n.id] ?? 0) > 0
                    ? `  ·  ×${analysis!.blockingFactor[n.id]} downstream`
                    : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Dependency manager ── */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>

        {/* Add dependency */}
        <div className="os-card" style={{ flex: "1 1 300px" }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)", marginBottom: "0.875rem" }}>
            Agregar dependencia
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                className="os-input"
                style={{ flex: 1 }}
                value={addFrom}
                onChange={(e) => setAddFrom(e.target.value)}
              >
                <option value="">Objetivo que depende…</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
              <span style={{ color: "var(--ink-3)", fontSize: "0.85rem" }}>depende de</span>
              <select
                className="os-input"
                style={{ flex: 1 }}
                value={addTo}
                onChange={(e) => setAddTo(e.target.value)}
              >
                <option value="">Objetivo requerido…</option>
                {nodes.filter((n) => n.id !== addFrom).map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
            {addError && <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>{addError}</p>}
            <button
              className="btn-primary"
              onClick={addEdge}
              disabled={!addFrom || !addTo || addSaving}
              style={{ alignSelf: "flex-start" }}
            >
              {addSaving ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>

        {/* Existing edges */}
        {edges.length > 0 && (
          <div className="os-card" style={{ flex: "1 1 300px" }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)", marginBottom: "0.875rem" }}>
              Dependencias activas ({edges.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {edges.map((e, i) => {
                const from = nodes.find((n) => n.id === e.from);
                const to   = nodes.find((n) => n.id === e.to);
                const cycle = isCycleEdge(e.from, e.to);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                    <span style={{ flex: 1, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {from?.label} <span style={{ color: cycle ? "var(--red)" : "var(--ink-3)" }}>→</span> {to?.label}
                    </span>
                    {cycle && <span style={{ color: "var(--red)", fontSize: "0.7rem", fontWeight: 700 }}>CICLO</span>}
                    <button
                      onClick={() => removeEdge(e.from, e.to)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: "0.75rem", flexShrink: 0 }}
                    >
                      ✕
                    </button>
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
