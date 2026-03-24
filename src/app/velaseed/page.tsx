"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type FormData = {
  ingresos: number;
  costos: number;
  margen: number;
  digitalizacion: number;
  replicabilidad: number;
  diferenciacion: number;
};

const initialData: FormData = {
  ingresos: 0,
  costos: 0,
  margen: 0,
  digitalizacion: 0,
  replicabilidad: 0,
  diferenciacion: 0,
};

const storageKey = "velaseed-mvp-form";

type ApiEvaluation = {
  id: string;
  iev: number;
  classification: string;
  survivalProbability: number;
  revenueDoubleProb: number;
  expansionProbability: number;
  formalizationProb: number;
  failureRisk: number;
};

type SessionUser = {
  name: string;
  email: string;
  role: "admin" | "analista" | "operador";
};

export default function VelaseedPage() {
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === "undefined") {
      return initialData;
    }

    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      return initialData;
    }

    try {
      return JSON.parse(saved) as FormData;
    } catch {
      return initialData;
    }
  });
  const [guardado, setGuardado] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "Aún no guardado";
    }
    return localStorage.getItem(storageKey)
      ? "Datos restaurados desde sesión previa"
      : "Aún no guardado";
  });
  const [resultadoApi, setResultadoApi] = useState<ApiEvaluation | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  const clasificacion = useMemo(() => {
    if (!resultadoApi) {
      return "Sin evaluación enviada";
    }

    if (resultadoApi.classification === "Scale Candidate") {
      return "🟢 Scale Candidate";
    }

    if (resultadoApi.classification === "Optimization Candidate") {
      return "🟡 Optimization Candidate";
    }

    return "🔴 Sustainability Candidate";
  }, [resultadoApi]);

  const guardar = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify(formData));
    setGuardado(`Guardado ${new Date().toLocaleTimeString()}`);
  }, [formData]);

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

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        guardar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [guardar]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    guardar();

    setEnviando(true);
    setErrorApi(null);

    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyRevenue: formData.ingresos,
          monthlyCosts: formData.costos,
          potentialMargin: formData.margen,
          digitalization: formData.digitalizacion,
          replicability: formData.replicabilidad,
          differentiation: formData.diferenciacion,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        }

        if (response.status === 403) {
          throw new Error("Tu rol no tiene permisos para registrar evaluaciones.");
        }

        throw new Error("No fue posible guardar en el backend");
      }

      const data: { evaluation: ApiEvaluation } = await response.json();
      setResultadoApi(data.evaluation);
      setGuardado(`Evaluación registrada ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo enviar a la API. Verifica DATABASE_URL y migraciones de Prisma.";
      setErrorApi(message);
    } finally {
      setEnviando(false);
    }
  };

  const updateNumber = (field: keyof FormData, value: string) => {
    const parsed = Number(value);
    setFormData((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">
            VELASEED · Diagnóstico y Escalabilidad
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Evaluación inicial de emprendimiento
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
            <Link href="/dashboard" className="text-sm font-medium underline">
              Ir al dashboard
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

        <section className="grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-xl border border-zinc-200 p-5 lg:col-span-2 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Business Scan (MVP)</h2>

            <label className="block text-sm">
              Ingresos mensuales (USD)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={formData.ingresos}
                onChange={(e) => updateNumber("ingresos", e.target.value)}
              />
            </label>

            <label className="block text-sm">
              Costos mensuales (USD)
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={formData.costos}
                onChange={(e) => updateNumber("costos", e.target.value)}
              />
            </label>

            <label className="block text-sm">
              Margen potencial estimado (0-100)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={formData.margen}
                onChange={(e) => updateNumber("margen", e.target.value)}
              />
            </label>

            <label className="block text-sm">
              Capacidad de digitalización (0-100)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={formData.digitalizacion}
                onChange={(e) => updateNumber("digitalizacion", e.target.value)}
              />
            </label>

            <label className="block text-sm">
              Replicabilidad del modelo (0-100)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={formData.replicabilidad}
                onChange={(e) => updateNumber("replicabilidad", e.target.value)}
              />
            </label>

            <label className="block text-sm">
              Diferenciación en mercado (0-100)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={formData.diferenciacion}
                onChange={(e) => updateNumber("diferenciacion", e.target.value)}
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={enviando}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
              >
                {enviando ? "Enviando..." : "Guardar evaluación"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
                onClick={() => {
                  setFormData(initialData);
                  setGuardado("Formulario reiniciado");
                  setResultadoApi(null);
                  setErrorApi(null);
                }}
              >
                Reiniciar
              </button>
              <p className="self-center text-sm text-zinc-500">{guardado}</p>
            </div>
            {errorApi && (
              <p className="text-sm font-medium text-red-500">{errorApi}</p>
            )}
          </form>

          <aside className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Resultado inteligente</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Índice de Escalabilidad VELASEED (IEV)
            </p>
            <p className="text-4xl font-bold">{resultadoApi?.iev ?? "-"}</p>
            <p className="text-sm font-semibold">{clasificacion}</p>
            {resultadoApi && (
              <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                <p>Supervivencia 5 años: {Math.round(resultadoApi.survivalProbability)}%</p>
                <p>Duplicar ingresos: {Math.round(resultadoApi.revenueDoubleProb)}%</p>
                <p>Expansión geográfica: {Math.round(resultadoApi.expansionProbability)}%</p>
                <p>Formalización exitosa: {Math.round(resultadoApi.formalizationProb)}%</p>
                <p>Riesgo de fracaso: {Math.round(resultadoApi.failureRisk)}%</p>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Atajo: usa Ctrl+S para guardar rápidamente en localStorage.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
