import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { collectVentureStats, ratio } from "@/lib/venture-metrics";
import { synthesizeCapitalIntelligence } from "@/lib/capital-intelligence";
import type { CapitalReadinessResponse } from "@/lib/functional-contracts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const stats = await collectVentureStats(auth.session.sub);

  const missing: CapitalReadinessResponse["missing"] = [];
  if (!stats.objectives.total) missing.push({ label: "Create first objective", href: "/build", reason: "Execution needs explicit objectives." });
  if (!stats.signals.interviews) missing.push({ label: "Record interview", href: "/validate", reason: "Capital evidence needs direct customer learning." });
  if (!stats.signals.metrics) missing.push({ label: "Record metric", href: "/validate", reason: "Traction gates need measurable evidence." });
  if (!stats.sprints.total) missing.push({ label: "Create Sprint", href: "/engine", reason: "Execution history demonstrates delivery capacity." });
  if (!stats.gates.total) missing.push({ label: "Define capital gates", href: "/capital", reason: "Capital criteria must be explicit." });

  const hasData = stats.gates.total > 0 || stats.objectives.total > 0 || stats.signals.total > 0;
  let readiness: number | null = null;
  if (hasData) {
    const components = [
      { weight: .5, result: ratio(stats.gates.passed, stats.gates.total) },
      { weight: .3, result: ratio((stats.signals.interviews > 0 ? 1 : 0) + (stats.signals.experiments > 0 ? 1 : 0) + (stats.signals.metrics > 0 ? 1 : 0) + (stats.signals.insights > 0 ? 1 : 0), 4) },
      { weight: .2, result: ratio(stats.objectives.completed, stats.objectives.total) },
    ];
    let weight = 0;
    let sum = 0;
    for (const component of components) {
      if (component.result.status === "AVAILABLE" && component.result.value !== null) {
        weight += component.weight;
        sum += component.weight * component.result.value;
      }
    }
    readiness = weight ? Math.round((sum / weight) * 100) : null;
  }

  const readinessData: CapitalReadinessResponse = {
    status: readiness === null ? "INSUFFICIENT_DATA" : "AVAILABLE",
    readiness,
    evidence: stats,
    gates: stats.gates,
    missing,
    explanation: readiness === null
      ? "Not enough evidence exists to assess capital readiness."
      : `Calculated from ${stats.gates.passed}/${stats.gates.total} passed gates, ${stats.signals.total} validation signal(s), and ${stats.objectives.completed}/${stats.objectives.total} completed objectives.`,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    intelligence: synthesizeCapitalIntelligence(readinessData),
    readiness: readinessData,
  });
}
