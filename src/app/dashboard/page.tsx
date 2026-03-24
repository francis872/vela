"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type DashboardResponse = {
  metrics: {
    totalEvaluations: number;
    averageIEV: number;
    averageRevenue: number;
  };
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
  const [classification, setClassification] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

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

  const metricas = [
    {
      label: "Evaluaciones registradas",
      value: data ? String(data.metrics.totalEvaluations) : "-",
      detalle: "Base Velaseed",
    },
    {
      label: "IEV promedio",
      value: data ? `${data.metrics.averageIEV}/100` : "-",
      detalle: "Scoring backend",
    },
    {
      label: "Ingreso medio",
      value: data ? `$${data.metrics.averageRevenue}` : "-",
      detalle: "Ingresos mensuales promedio",
    },
    {
      label: "Últimas evaluaciones",
      value: data ? String(data.recent.length) : "-",
      detalle: "Ventana de monitoreo",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">
            Dashboard institucional
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Control de portafolio VELA
          </h1>
          {user && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Sesión: {user.name} · Rol {user.role}
            </p>
          )}
          <div className="flex gap-3">
            <Link href="/" className="text-sm font-medium underline">
              Volver al inicio
            </Link>
            <Link href="/velaseed" className="text-sm font-medium underline">
              Ir a VELASEED
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium underline"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Filtros</h2>
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
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricas.map((metrica) => (
            <article
              key={metrica.label}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {metrica.label}
              </p>
              <p className="mt-2 text-2xl font-bold">{metrica.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                {metrica.detalle}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Distribución por clasificación</h2>
          {error ? (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {(data?.byClassification ?? []).map((item) => (
                <li key={item.classification}>
                  • {item.classification}: {item._count._all}
                </li>
              ))}
              {!data?.byClassification?.length && (
                <li>• Aún no hay registros en base de datos.</li>
              )}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Actividad reciente</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            {(data?.recent ?? []).map((item) => (
              <li key={item.id}>
                • {item.classification} · IEV {item.iev} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </li>
            ))}
            {!data?.recent?.length && <li>• Sin actividad reciente.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
