import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { collectVentureStats, ratio } from "@/lib/venture-metrics";
import { dispatchDomainEvent } from "@/lib/domain-events";
import type { CapitalReadinessResponse } from "@/lib/functional-contracts";

export const dynamic = "force-dynamic";

type NextAction = { label: string; href: string; reason: string };

/**
 * GET /api/capital/readiness
 *
 * Capital readiness computed from REAL venture data: gates, validation
 * evidence and execution history. Returns INSUFFICIENT_DATA when the venture
 * has no data instead of inventing a score.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const stats = await collectVentureStats(auth.session.sub);

  const hasAnyData =
    stats.gates.total > 0 || stats.objectives.total > 0 || stats.signals.total > 0;

  const missing: NextAction[] = [];
  if (stats.objectives.total === 0) {
    missing.push({
      label: "Crear primer objetivo",
      href: "/build",
      reason: "Sin objetivos no hay ejecución que evaluar",
    });
  }
  if (stats.signals.interviews === 0) {
    missing.push({
      label: "Registrar entrevista",
      href: "/validate",
      reason: "Necesitas evidencia de clientes para completar gates de validación",
    });
  }
  if (stats.signals.metrics === 0) {
    missing.push({
      label: "Registrar métrica",
      href: "/validate",
      reason: "Los gates de tracción requieren métricas reales",
    });
  }
  if (stats.sprints.total === 0) {
    missing.push({
      label: "Crear sprint",
      href: "/engine",
      reason: "El historial de ejecución demuestra capacidad de entrega",
    });
  }
  if (stats.gates.total === 0) {
    missing.push({
      label: "Definir gates de capital",
      href: "/capital",
      reason: "Define los criterios que tu venture debe cumplir",
    });
  }

  if (!hasAnyData) {
    await dispatchDomainEvent("capital_evaluated", { ownerId: auth.session.sub, readiness: null });
    const response: CapitalReadinessResponse = {
      status: "INSUFFICIENT_DATA",
      readiness: null,
      evidence: stats,
      gates: stats.gates,
      missing,
      explanation:
        "Aún no existe evidencia suficiente para evaluar readiness de capital.",
    };
    return NextResponse.json(response);
  }

  // Weighted score over components that actually have data.
  const components: { weight: number; result: ReturnType<typeof ratio> }[] = [
    { weight: 0.5, result: ratio(stats.gates.passed, stats.gates.total) },
    {
      weight: 0.3,
      result: ratio(
        (stats.signals.interviews > 0 ? 1 : 0) +
          (stats.signals.experiments > 0 ? 1 : 0) +
          (stats.signals.metrics > 0 ? 1 : 0) +
          (stats.signals.insights > 0 ? 1 : 0),
        4,
      ),
    },
    { weight: 0.2, result: ratio(stats.objectives.completed, stats.objectives.total) },
  ];

  let weightSum = 0;
  let acc = 0;
  for (const component of components) {
    if (component.result.status === "AVAILABLE" && component.result.value !== null) {
      weightSum += component.weight;
      acc += component.weight * component.result.value;
    }
  }

  const readiness = weightSum > 0 ? Math.round((acc / weightSum) * 100) : null;

  await dispatchDomainEvent("capital_evaluated", { ownerId: auth.session.sub, readiness });

  const response: CapitalReadinessResponse = {
    status: readiness === null ? "INSUFFICIENT_DATA" : "AVAILABLE",
    readiness,
    evidence: stats,
    gates: stats.gates,
    missing,
    explanation:
      readiness === null
        ? "Aún no existe evidencia suficiente para evaluar readiness de capital."
        : `Calculado con ${stats.gates.passed}/${stats.gates.total} gates superados, ${stats.signals.total} señal(es) de validación y ${stats.objectives.completed}/${stats.objectives.total} objetivos completados.`,
  };
  return NextResponse.json(response);
}
