"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertLevel,
  DashboardAlert,
  DashboardThresholds,
  DEFAULT_DASHBOARD_THRESHOLDS,
  getAlertStyles,
  getClassificationLevel,
  getHighIsBetterLevel,
  getLowIsBetterLevel,
} from "@/lib/dashboard-thresholds";

type DashboardResponse = {
  metrics: {
    totalEvaluations: number;
    averageIEV: number;
    averageRevenue: number;
    confidenceScore: number;
    averageFailureRisk: number;
    highRiskShare: number;
  };
  thresholds: DashboardThresholds;
  alerts: DashboardAlert[];
  byClassification: Array<{
    classification: string;
    _count: { _all: number };
  }>;
  recent: Array<{
    id: string;
    classification: string;
    iev: number;
    createdAt: string;
  }>;
};

type SessionUser = {
  name: string;
  email: string;
  role: "admin" | "analista" | "operador";
};

type FilterParams = {
  classification: string;
  startDate: string;
  endDate: string;
};

function normalizeClassification(value: string | null) {
  if (
    value === "Scale Candidate" ||
    value === "Optimization Candidate" ||
    value === "Sustainability Candidate"
  ) {
    return value;
  }

  return "all";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [thresholdsDraft, setThresholdsDraft] = useState<DashboardThresholds | null>(null);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdMessage, setThresholdMessage] = useState<string | null>(null);
  const [classification, setClassification] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const thresholds = data?.thresholds ?? thresholdsDraft ?? DEFAULT_DASHBOARD_THRESHOLDS;

  const buildQueryParams = (params: FilterParams) => {
    const query = new URLSearchParams();

    if (params.classification && params.classification !== "all") {
      query.set("classification", params.classification);
    }

    if (params.startDate) {
      query.set("startDate", params.startDate);
    }

    if (params.endDate) {
      query.set("endDate", params.endDate);
    }

    return query;
  };

  const syncFiltersInUrl = (params: FilterParams) => {
    const query = buildQueryParams(params);

    const queryString = query.toString();
    const nextUrl = queryString ? `/dashboard?${queryString}` : "/dashboard";
    window.history.replaceState(null, "", nextUrl);
  };

  const loadDashboard = useCallback(async (params: FilterParams) => {
    setLoading(true);
    setError(null);

    try {
      const query = buildQueryParams(params);

      const endpoint = query.toString()
        ? `/api/dashboard?${query.toString()}`
        : "/api/dashboard";

      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 401) {
          setError("Sesión expirada. Inicia sesión nuevamente.");
          return;
        }

        if (response.status === 403) {
          setError("Tu rol actual no puede acceder al dashboard.");
          return;
        }

        throw new Error("No se pudo cargar dashboard");
      }

      const parsed: DashboardResponse = await response.json();
      setData(parsed);
      setThresholdsDraft(parsed.thresholds);
    } catch {
      setError(
        "No se pudieron cargar métricas. Revisa DATABASE_URL y migración de Prisma.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload: { user: SessionUser } = await response.json();
      setUser(payload.user);
    };

    loadSession();

    const query = new URLSearchParams(window.location.search);
    const initialFilters: FilterParams = {
      classification: normalizeClassification(query.get("classification")),
      startDate: query.get("startDate") || "",
      endDate: query.get("endDate") || "",
    };

    setClassification(initialFilters.classification);
    setStartDate(initialFilters.startDate);
    setEndDate(initialFilters.endDate);

    loadDashboard(initialFilters);
  }, [loadDashboard]);

  const applyFilters = async (event: FormEvent) => {
    event.preventDefault();

    const filters: FilterParams = { classification, startDate, endDate };
    syncFiltersInUrl(filters);
    await loadDashboard(filters);
  };

  const updateDraft = (
    section: keyof DashboardThresholds,
    key: string,
    value: number,
  ) => {
    setThresholdsDraft((current) => {
      const base = current ?? DEFAULT_DASHBOARD_THRESHOLDS;

      return {
        ...base,
        [section]: {
          ...base[section],
          [key]: value,
        },
      } as DashboardThresholds;
    });
  };

  const saveThresholds = async (event: FormEvent) => {
    event.preventDefault();

    if (!thresholdsDraft) {
      return;
    }

    setSavingThresholds(true);
    setThresholdMessage(null);

    try {
      const response = await fetch("/api/dashboard/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholdsDraft),
      });

      if (!response.ok) {
        throw new Error("No se pudo guardar la configuración");
      }

      const parsed: { thresholds: DashboardThresholds } = await response.json();
      setThresholdsDraft(parsed.thresholds);
      setData((current) =>
        current
          ? {
              ...current,
              thresholds: parsed.thresholds,
            }
          : current,
      );
      setThresholdMessage("Umbrales actualizados.");
      await loadDashboard({ classification, startDate, endDate });
    } catch {
      setThresholdMessage("No se pudieron guardar los umbrales.");
    } finally {
      setSavingThresholds(false);
    }
  };

  const clearFilters = async () => {
    const filters: FilterParams = { classification: "all", startDate: "", endDate: "" };
    setClassification(filters.classification);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    syncFiltersInUrl(filters);
    await loadDashboard(filters);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const exportCsv = () => {
    const filters: FilterParams = { classification, startDate, endDate };
    const query = buildQueryParams(filters).toString();
    const endpoint = query
      ? `/api/dashboard/export?${query}`
      : "/api/dashboard/export";
    window.location.href = endpoint;
  };

  const averageIevLevel = data
    ? getHighIsBetterLevel(data.metrics.averageIEV, thresholds.iev)
    : "warning";
  const confidenceLevel = data
    ? getHighIsBetterLevel(data.metrics.confidenceScore, thresholds.confidence)
    : "warning";
  const averageRiskLevel = data
    ? getLowIsBetterLevel(data.metrics.averageFailureRisk, thresholds.averageFailureRisk)
    : "warning";
  const highRiskShareLevel = data
    ? getLowIsBetterLevel(data.metrics.highRiskShare, thresholds.highRiskShare)
    : "warning";

  const metricas = [
    {
      label: "Evaluaciones registradas",
      value: data ? String(data.metrics.totalEvaluations) : "-",
      detalle: "Base Velaseed",
      level: "healthy" as AlertLevel,
    },
    {
      label: "IEV promedio",
      value: data ? `${data.metrics.averageIEV}/100` : "-",
      detalle: "Scoring backend",
      level: averageIevLevel,
    },
    {
      label: "Ingreso medio",
      value: data ? `$${data.metrics.averageRevenue}` : "-",
      detalle: "Ingresos mensuales promedio",
      level: "healthy" as AlertLevel,
    },
    {
      label: "Confianza del modelo",
      value: data ? `${data.metrics.confidenceScore}/100` : "-",
      detalle: "Calidad estadística del histórico",
      level: confidenceLevel,
    },
    {
      label: "Riesgo promedio",
      value: data ? `${data.metrics.averageFailureRisk}%` : "-",
      detalle: "Probabilidad media de falla",
      level: averageRiskLevel,
    },
    {
      label: "Cartera en alto riesgo",
      value: data ? `${data.metrics.highRiskShare}%` : "-",
      detalle: "Evaluaciones con riesgo >= 60%",
      level: highRiskShareLevel,
    },
    {
      label: "Últimas evaluaciones",
      value: data ? String(data.recent.length) : "-",
      detalle: "Ventana de monitoreo",
      level: "warning" as AlertLevel,
    },
  ];

  const operationalSignals = [
    {
      title: "Confiabilidad analítica",
      description:
        confidenceLevel === "critical"
          ? "El histórico todavía es débil o inestable; las decisiones deben revisarse con criterio humano."
          : confidenceLevel === "warning"
            ? "La base estadística es útil, pero todavía puede mejorar con más datos frescos."
            : "La base estadística es suficientemente consistente para soportar decisiones operativas.",
      level: confidenceLevel,
    },
    {
      title: "Riesgo del portafolio",
      description:
        averageRiskLevel === "critical"
          ? "El riesgo promedio del portafolio es alto y requiere intervención prioritaria."
          : averageRiskLevel === "warning"
            ? "Hay presión de riesgo relevante; conviene reforzar seguimiento y mitigación."
            : "El riesgo promedio del portafolio se mantiene dentro de un rango controlado.",
      level: averageRiskLevel,
    },
    {
      title: "Concentración de casos críticos",
      description:
        highRiskShareLevel === "critical"
          ? "La cartera acumula demasiados casos frágiles; hay señales de estrés sistémico."
          : highRiskShareLevel === "warning"
            ? "La proporción de casos en alto riesgo merece atención antes de que escale."
            : "La exposición a casos críticos sigue contenida frente al total evaluado.",
      level: highRiskShareLevel,
    },
  ];

  const classificationItems = (data?.byClassification ?? []).map((item) => {
    const level = getClassificationLevel(item.classification);
    const share = data?.metrics.totalEvaluations
      ? Math.round((item._count._all / data.metrics.totalEvaluations) * 100)
      : 0;

    return {
      ...item,
      level,
      share,
    };
  });

  const recentActivityItems = (data?.recent ?? []).map((item) => ({
    ...item,
    level: getHighIsBetterLevel(item.iev, thresholds.iev),
  }));

  const hasCriticalAlerts = (data?.alerts ?? []).some((alert) => alert.level === "critical");

  return (
    <div className="vela-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="vela-reveal space-y-4 rounded-2xl border border-border p-6 md:p-8">
          <p className="vela-pill">
            Venture Intelligence Board
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Controla el portafolio con señales, no con intuición
          </h1>
          <p className="text-sm vela-muted">
            Este tablero traduce datos operativos en decisiones de acompañamiento para startups del ecosistema VELA.
          </p>
          {user && (
            <p className="text-sm vela-muted">
              Sesión: {user.name} · Rol {user.role}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
              Volver al inicio
            </Link>
            <Link href="/velaseed" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
              Ir a VELASEED
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {!!data?.alerts.length && (
          <section className={`vela-reveal rounded-xl border p-6 ${hasCriticalAlerts ? "border-rose-200 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/30" : "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Alertas automáticas</h2>
                <p className="mt-1 text-sm vela-muted">
                  Se disparan automáticamente cuando una métrica cae en nivel crítico según los umbrales activos.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${hasCriticalAlerts ? "bg-rose-600 text-white" : "bg-amber-500 text-black"}`}>
                {(data?.alerts ?? []).length} activas
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(data?.alerts ?? []).map((alert) => {
                const alertStyles = getAlertStyles(alert.level);

                return (
                  <article
                    key={alert.id}
                    className={`rounded-xl border p-4 ${alertStyles.card}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{alert.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${alertStyles.badge}`}>
                        {alertStyles.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {alert.detail}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="vela-reveal rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Orquestación de filtros</h2>
          <p className="mt-1 text-sm vela-muted">
            Segmenta por clasificación y tiempo para detectar patrones de escalamiento y riesgo.
          </p>
          <form onSubmit={applyFilters} className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              Clasificación
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
              >
                <option value="all">Todas</option>
                <option value="Scale Candidate">Scale Candidate</option>
                <option value="Optimization Candidate">Optimization Candidate</option>
                <option value="Sustainability Candidate">Sustainability Candidate</option>
              </select>
            </label>

            <label className="text-sm">
              Desde
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="text-sm">
              Hasta
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="vela-accent-button px-4 py-2 text-sm"
                disabled={loading}
              >
                {loading ? "Aplicando..." : "Aplicar"}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
                disabled={loading}
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
              >
                Exportar CSV
              </button>
            </div>
          </form>
        </section>

        <section className="vela-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricas.map((metrica) => (
            (() => {
              const alertStyles = getAlertStyles(metrica.level);

              return (
            <article
              key={metrica.label}
              className={`vela-hover-lift rounded-xl border p-4 ${alertStyles.card}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {metrica.label}
                </p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${alertStyles.badge}`}>
                  {alertStyles.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{metrica.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                {metrica.detalle}
              </p>
            </article>
              );
            })()
          ))}
        </section>

        <section className="vela-reveal rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Semáforo operativo</h2>
              <p className="mt-1 text-sm vela-muted">
                Umbrales configurados en el dashboard para interpretar confianza, calidad del score y presión de riesgo.
              </p>
            </div>
            <div className="text-sm vela-muted">
              IEV saludable desde {thresholds.iev.healthy} · Confianza saludable desde {thresholds.confidence.healthy}
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {operationalSignals.map((signal) => {
              const alertStyles = getAlertStyles(signal.level);

              return (
                <article
                  key={signal.title}
                  className={`rounded-xl border p-4 ${alertStyles.card}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{signal.title}</h3>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${alertStyles.badge}`}>
                      {alertStyles.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {signal.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {user?.role === "admin" && thresholdsDraft && (
          <section className="vela-reveal rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Configuración persistente de umbrales</h2>
                <p className="mt-1 text-sm vela-muted">
                  Estos valores se guardan en base de datos y redefinen el semáforo sin tocar código.
                </p>
              </div>
              {thresholdMessage && <p className="text-sm vela-muted">{thresholdMessage}</p>}
            </div>
            <form onSubmit={saveThresholds} className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                IEV saludable desde
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.iev.healthy}
                  onChange={(event) => updateDraft("iev", "healthy", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                IEV atención desde
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.iev.warning}
                  onChange={(event) => updateDraft("iev", "warning", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                Confianza saludable desde
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.confidence.healthy}
                  onChange={(event) => updateDraft("confidence", "healthy", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                Confianza atención desde
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.confidence.warning}
                  onChange={(event) => updateDraft("confidence", "warning", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                Riesgo promedio saludable hasta
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.averageFailureRisk.healthyMax}
                  onChange={(event) => updateDraft("averageFailureRisk", "healthyMax", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                Riesgo promedio atención hasta
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.averageFailureRisk.warningMax}
                  onChange={(event) => updateDraft("averageFailureRisk", "warningMax", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                Cartera en alto riesgo saludable hasta
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.highRiskShare.healthyMax}
                  onChange={(event) => updateDraft("highRiskShare", "healthyMax", Number(event.target.value))}
                />
              </label>
              <label className="text-sm">
                Cartera en alto riesgo atención hasta
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={thresholdsDraft.highRiskShare.warningMax}
                  onChange={(event) => updateDraft("highRiskShare", "warningMax", Number(event.target.value))}
                />
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="vela-accent-button px-4 py-2 text-sm"
                  disabled={savingThresholds}
                >
                  {savingThresholds ? "Guardando..." : "Guardar umbrales"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="vela-reveal rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Mapa de clasificación del pipeline</h2>
          {error ? (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {classificationItems.map((item) => {
                const alertStyles = getAlertStyles(item.level);

                return (
                  <article
                    key={item.classification}
                    className={`rounded-xl border p-4 ${alertStyles.card}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{item.classification}</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${alertStyles.badge}`}>
                        {alertStyles.label}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold">{item._count._all}</p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {item.share}% del pipeline filtrado
                    </p>
                  </article>
                );
              })}
              {!classificationItems.length && (
                <article className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                  Aún no hay registros en base de datos.
                </article>
              )}
            </div>
          )}
        </section>

        <section className="vela-reveal rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Radar de actividad reciente</h2>
          <div className="mt-4 space-y-3">
            {recentActivityItems.map((item) => {
              const alertStyles = getAlertStyles(item.level);

              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${alertStyles.card}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.classification}</p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        IEV {item.iev} · {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${alertStyles.badge}`}>
                      {alertStyles.label}
                    </span>
                  </div>
                </article>
              );
            })}
            {!recentActivityItems.length && (
              <article className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                Sin actividad reciente.
              </article>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
