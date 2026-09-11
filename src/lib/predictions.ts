import { ratio, type VentureStats } from "@/lib/venture-metrics";

/**
 * VELA Predictive Engine — baseline layer.
 *
 * Deterministic, explainable rules over real operational data. These are the
 * baselines that any future ML model must beat before promotion. They never
 * fabricate probability: below the minimum evidence threshold they return
 * INSUFFICIENT_DATA.
 */

export const PREDICTION_MODEL_VERSION = "rules-v1";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type Prediction = {
  status: "AVAILABLE" | "INSUFFICIENT_DATA";
  level: RiskLevel | null;
  factors: string[];
  model: typeof PREDICTION_MODEL_VERSION;
  generatedAt: string;
};

function now() {
  return new Date().toISOString();
}

function insufficient(factors: string[] = []): Prediction {
  return {
    status: "INSUFFICIENT_DATA",
    level: null,
    factors,
    model: PREDICTION_MODEL_VERSION,
    generatedAt: now(),
  };
}

/** Risk that current execution stalls (blocked work, failed cadence). */
export function assessExecutionRisk(stats: VentureStats): Prediction {
  const { objectives, sprints } = stats;
  if (objectives.total === 0 && sprints.total === 0) {
    return insufficient(["Sin objetivos ni sprints registrados todavía"]);
  }

  const factors: string[] = [];
  let score = 0;

  const blockedRatio = ratio(objectives.blocked, objectives.total);
  if (blockedRatio.status === "AVAILABLE" && blockedRatio.value !== null) {
    if (blockedRatio.value >= 0.5) {
      score += 2;
      factors.push(`${objectives.blocked} de ${objectives.total} objetivos bloqueados`);
    } else if (blockedRatio.value >= 0.25) {
      score += 1;
      factors.push("Algunos objetivos bloqueados");
    }
  }

  const blockedSprints = ratio(sprints.blocked, sprints.total);
  if (blockedSprints.status === "AVAILABLE" && blockedSprints.value !== null && blockedSprints.value > 0) {
    score += 1;
    factors.push(`${sprints.blocked} sprint(s) en estado bloqueado`);
  }

  const completion = ratio(sprints.itemsDone, sprints.items);
  if (completion.status === "AVAILABLE" && completion.value !== null && completion.value < 0.4) {
    score += 1;
    factors.push(`Solo ${Math.round(completion.value * 100)}% de compromisos de sprint completados`);
  }

  const level: RiskLevel = score >= 3 ? "HIGH" : score >= 1 ? "MEDIUM" : "LOW";
  if (factors.length === 0) factors.push("Ejecución dentro de parámetros normales");

  return { status: "AVAILABLE", level, factors, model: PREDICTION_MODEL_VERSION, generatedAt: now() };
}

/** Risk of executing without enough market evidence. */
export function assessValidationGap(stats: VentureStats): Prediction {
  const { objectives, signals } = stats;
  if (objectives.total === 0) {
    return insufficient(["Sin objetivos: no hay ejecución que contrastar con evidencia"]);
  }

  const factors: string[] = [];
  let score = 0;

  if (signals.total === 0) {
    score += 3;
    factors.push("Ejecutando sin ninguna señal de validación registrada");
  } else {
    if (signals.interviews === 0) {
      score += 2;
      factors.push("Sin entrevistas a clientes registradas");
    }
    const coverage = ratio(signals.linkedToObjective, objectives.total);
    if (coverage.status === "AVAILABLE" && coverage.value !== null && coverage.value < 0.5) {
      score += 1;
      factors.push("Menos de la mitad de los objetivos tienen evidencia vinculada");
    }
    if (signals.last30d === 0) {
      score += 1;
      factors.push("Sin evidencia nueva en los últimos 30 días");
    }
  }

  const level: RiskLevel = score >= 3 ? "HIGH" : score >= 1 ? "MEDIUM" : "LOW";
  if (factors.length === 0) factors.push("Validación activa y vinculada a objetivos");

  return { status: "AVAILABLE", level, factors, model: PREDICTION_MODEL_VERSION, generatedAt: now() };
}

export type TrajectoryStatus =
  | "STRONG_POSITIVE"
  | "POSITIVE"
  | "STABLE"
  | "AT_RISK"
  | "DECLINING"
  | "INSUFFICIENT_DATA";

export type TrajectoryAssessment = {
  status: TrajectoryStatus;
  factors: string[];
  model: typeof PREDICTION_MODEL_VERSION;
  generatedAt: string;
};

const MIN_TRAJECTORY_RECORDS = 3;
const STALE_SIGNAL_DAYS = 20;

/** "¿Vamos por buen camino?" — combines execution, evidence and recency. */
export function assessTrajectory(stats: VentureStats): TrajectoryAssessment {
  const records = stats.objectives.total + stats.sprints.total + stats.signals.total;
  if (records < MIN_TRAJECTORY_RECORDS) {
    return {
      status: "INSUFFICIENT_DATA",
      factors: [
        "Señal preliminar. Todavía no existen suficientes observaciones para determinar una tendencia confiable.",
      ],
      model: PREDICTION_MODEL_VERSION,
      generatedAt: now(),
    };
  }

  const factors: string[] = [];
  let score = 0;

  const blockedRatio = ratio(stats.objectives.blocked, stats.objectives.total);
  if (blockedRatio.status === "AVAILABLE" && blockedRatio.value !== null) {
    if (blockedRatio.value >= 0.5) {
      score -= 2;
      factors.push(`${Math.round(blockedRatio.value * 100)}% de los objetivos están bloqueados`);
    } else if (blockedRatio.value === 0 && stats.objectives.total > 0) {
      score += 1;
      factors.push("Ningún objetivo bloqueado");
    }
  }

  if (stats.signals.lastSignalAt) {
    const daysSince = Math.floor(
      (Date.now() - stats.signals.lastSignalAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysSince > STALE_SIGNAL_DAYS) {
      score -= 2;
      factors.push(`Sin evidencia de validación en ${daysSince} días`);
    } else {
      score += 1;
      factors.push("Validación activa reciente");
    }
  } else if (stats.objectives.total > 0) {
    score -= 1;
    factors.push("Objetivos sin evidencia de validación asociada");
  }

  const sprintCompletion = ratio(stats.sprints.completed, stats.sprints.total);
  if (sprintCompletion.status === "AVAILABLE" && sprintCompletion.value !== null) {
    if (sprintCompletion.value >= 0.5) {
      score += 1;
      factors.push(`${stats.sprints.completed} sprint(s) completado(s)`);
    } else if (sprintCompletion.value === 0 && stats.sprints.total >= 2) {
      score -= 1;
      factors.push("Ningún sprint completado todavía");
    }
  }

  if (stats.objectives.completed > 0) {
    score += 1;
    factors.push(`${stats.objectives.completed} objetivo(s) completado(s)`);
  }

  if (stats.decisions.last30d === 0 && stats.decisions.total > 0) {
    score -= 1;
    factors.push("Sin decisiones registradas en los últimos 30 días");
  }

  const status: TrajectoryStatus =
    score >= 4 ? "STRONG_POSITIVE"
    : score >= 2 ? "POSITIVE"
    : score >= 0 ? "STABLE"
    : score === -1 ? "AT_RISK"
    : "DECLINING";

  return { status, factors, model: PREDICTION_MODEL_VERSION, generatedAt: now() };
}
