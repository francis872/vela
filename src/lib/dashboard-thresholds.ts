export type AlertLevel = "healthy" | "warning" | "critical";

export type DashboardThresholds = {
  iev: { healthy: number; warning: number };
  confidence: { healthy: number; warning: number };
  averageFailureRisk: { healthyMax: number; warningMax: number };
  highRiskShare: { healthyMax: number; warningMax: number };
};

export type DashboardAlert = {
  id: string;
  title: string;
  detail: string;
  level: AlertLevel;
};

export const DEFAULT_DASHBOARD_THRESHOLDS: DashboardThresholds = {
  iev: { healthy: 70, warning: 50 },
  confidence: { healthy: 75, warning: 50 },
  averageFailureRisk: { healthyMax: 35, warningMax: 55 },
  highRiskShare: { healthyMax: 20, warningMax: 40 },
};

export type DashboardThresholdRecord = {
  ievHealthy: number;
  ievWarning: number;
  confidenceHealthy: number;
  confidenceWarning: number;
  averageFailureRiskHealthyMax: number;
  averageFailureRiskWarningMax: number;
  highRiskShareHealthyMax: number;
  highRiskShareWarningMax: number;
};

export type DashboardMetricSnapshot = {
  averageIEV: number;
  confidenceScore: number;
  averageFailureRisk: number;
  highRiskShare: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function mapRecordToThresholds(
  record: Partial<DashboardThresholdRecord> | null | undefined,
): DashboardThresholds {
  return normalizeThresholds({
    iev: {
      healthy: record?.ievHealthy ?? DEFAULT_DASHBOARD_THRESHOLDS.iev.healthy,
      warning: record?.ievWarning ?? DEFAULT_DASHBOARD_THRESHOLDS.iev.warning,
    },
    confidence: {
      healthy:
        record?.confidenceHealthy ?? DEFAULT_DASHBOARD_THRESHOLDS.confidence.healthy,
      warning:
        record?.confidenceWarning ?? DEFAULT_DASHBOARD_THRESHOLDS.confidence.warning,
    },
    averageFailureRisk: {
      healthyMax:
        record?.averageFailureRiskHealthyMax ??
        DEFAULT_DASHBOARD_THRESHOLDS.averageFailureRisk.healthyMax,
      warningMax:
        record?.averageFailureRiskWarningMax ??
        DEFAULT_DASHBOARD_THRESHOLDS.averageFailureRisk.warningMax,
    },
    highRiskShare: {
      healthyMax:
        record?.highRiskShareHealthyMax ??
        DEFAULT_DASHBOARD_THRESHOLDS.highRiskShare.healthyMax,
      warningMax:
        record?.highRiskShareWarningMax ??
        DEFAULT_DASHBOARD_THRESHOLDS.highRiskShare.warningMax,
    },
  });
}

export function flattenThresholds(
  thresholds: DashboardThresholds,
): DashboardThresholdRecord {
  const normalized = normalizeThresholds(thresholds);

  return {
    ievHealthy: normalized.iev.healthy,
    ievWarning: normalized.iev.warning,
    confidenceHealthy: normalized.confidence.healthy,
    confidenceWarning: normalized.confidence.warning,
    averageFailureRiskHealthyMax: normalized.averageFailureRisk.healthyMax,
    averageFailureRiskWarningMax: normalized.averageFailureRisk.warningMax,
    highRiskShareHealthyMax: normalized.highRiskShare.healthyMax,
    highRiskShareWarningMax: normalized.highRiskShare.warningMax,
  };
}

export function normalizeThresholds(
  thresholds: DashboardThresholds,
): DashboardThresholds {
  const ievWarning = clamp(Math.round(thresholds.iev.warning), 0, 100);
  const ievHealthy = clamp(Math.round(thresholds.iev.healthy), ievWarning, 100);

  const confidenceWarning = clamp(Math.round(thresholds.confidence.warning), 0, 100);
  const confidenceHealthy = clamp(
    Math.round(thresholds.confidence.healthy),
    confidenceWarning,
    100,
  );

  const averageFailureRiskHealthyMax = clamp(
    Math.round(thresholds.averageFailureRisk.healthyMax),
    0,
    100,
  );
  const averageFailureRiskWarningMax = clamp(
    Math.round(thresholds.averageFailureRisk.warningMax),
    averageFailureRiskHealthyMax,
    100,
  );

  const highRiskShareHealthyMax = clamp(
    Math.round(thresholds.highRiskShare.healthyMax),
    0,
    100,
  );
  const highRiskShareWarningMax = clamp(
    Math.round(thresholds.highRiskShare.warningMax),
    highRiskShareHealthyMax,
    100,
  );

  return {
    iev: { healthy: ievHealthy, warning: ievWarning },
    confidence: {
      healthy: confidenceHealthy,
      warning: confidenceWarning,
    },
    averageFailureRisk: {
      healthyMax: averageFailureRiskHealthyMax,
      warningMax: averageFailureRiskWarningMax,
    },
    highRiskShare: {
      healthyMax: highRiskShareHealthyMax,
      warningMax: highRiskShareWarningMax,
    },
  };
}

export function getHighIsBetterLevel(
  value: number,
  thresholds: { healthy: number; warning: number },
): AlertLevel {
  if (value >= thresholds.healthy) {
    return "healthy";
  }

  if (value >= thresholds.warning) {
    return "warning";
  }

  return "critical";
}

export function getLowIsBetterLevel(
  value: number,
  thresholds: { healthyMax: number; warningMax: number },
): AlertLevel {
  if (value <= thresholds.healthyMax) {
    return "healthy";
  }

  if (value <= thresholds.warningMax) {
    return "warning";
  }

  return "critical";
}

export function getAlertStyles(level: AlertLevel) {
  if (level === "healthy") {
    return {
      card: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
      badge: "bg-emerald-600 text-white",
      label: "Saludable",
    };
  }

  if (level === "warning") {
    return {
      card: "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30",
      badge: "bg-amber-500 text-black",
      label: "Atención",
    };
  }

  return {
    card: "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30",
    badge: "bg-rose-600 text-white",
    label: "Crítico",
  };
}

export function getClassificationLevel(classification: string): AlertLevel {
  if (classification === "Scale Candidate") {
    return "healthy";
  }

  if (classification === "Optimization Candidate") {
    return "warning";
  }

  return "critical";
}

export function buildDashboardAlerts(
  metrics: DashboardMetricSnapshot,
  thresholds: DashboardThresholds,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const averageIevLevel = getHighIsBetterLevel(metrics.averageIEV, thresholds.iev);
  if (averageIevLevel === "critical") {
    alerts.push({
      id: "average-iev-critical",
      title: "IEV promedio en zona crítica",
      detail:
        "La calidad media del portafolio cayó por debajo del umbral mínimo y requiere intervención prioritaria.",
      level: "critical",
    });
  }

  const confidenceLevel = getHighIsBetterLevel(
    metrics.confidenceScore,
    thresholds.confidence,
  );
  if (confidenceLevel === "critical") {
    alerts.push({
      id: "confidence-critical",
      title: "Confianza estadística insuficiente",
      detail:
        "El histórico disponible no alcanza el umbral mínimo para sostener decisiones automáticas con seguridad.",
      level: "critical",
    });
  }

  const averageRiskLevel = getLowIsBetterLevel(
    metrics.averageFailureRisk,
    thresholds.averageFailureRisk,
  );
  if (averageRiskLevel === "critical") {
    alerts.push({
      id: "average-risk-critical",
      title: "Riesgo promedio del portafolio elevado",
      detail:
        "La probabilidad media de falla superó el rango tolerable definido para la cartera activa.",
      level: "critical",
    });
  }

  const highRiskShareLevel = getLowIsBetterLevel(
    metrics.highRiskShare,
    thresholds.highRiskShare,
  );
  if (highRiskShareLevel === "critical") {
    alerts.push({
      id: "high-risk-share-critical",
      title: "Demasiados casos en alto riesgo",
      detail:
        "La proporción de evaluaciones en alto riesgo excedió el máximo aceptable y puede afectar la estabilidad del portafolio.",
      level: "critical",
    });
  }

  return alerts;
}