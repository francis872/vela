"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type FormData = {
  companyName: string;
  companySector: string;
  businessModel: string;
  companyStage: string;
  trajectorySummary: string;
  challengeSummary: string;
  yearsOperating: number;
  teamSize: number;
  ingresos: number;
  costos: number;
  margen: number;
  digitalizacion: number;
  replicabilidad: number;
  diferenciacion: number;
};

const initialData: FormData = {
  companyName: "",
  companySector: "",
  businessModel: "",
  companyStage: "validation",
  trajectorySummary: "",
  challengeSummary: "",
  yearsOperating: 0,
  teamSize: 1,
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
  companyName: string;
  companySector: string;
  businessModel: string;
  companyStage: string;
  yearsOperating: number;
  teamSize: number;
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
  const [recentEvaluations, setRecentEvaluations] = useState<ApiEvaluation[]>([]);

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

      const recentResponse = await fetch("/api/evaluations", { cache: "no-store" });
      if (recentResponse.ok) {
        const recentPayload: { evaluations: ApiEvaluation[] } = await recentResponse.json();
        setRecentEvaluations(recentPayload.evaluations.slice(0, 8));
      }
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
          companyName: formData.companyName,
          companySector: formData.companySector,
          businessModel: formData.businessModel,
          companyStage: formData.companyStage,
          trajectorySummary: formData.trajectorySummary,
          challengeSummary: formData.challengeSummary,
          yearsOperating: formData.yearsOperating,
          teamSize: formData.teamSize,
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
      setRecentEvaluations((prev) => [data.evaluation, ...prev].slice(0, 8));
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
    <div className="vela-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="vela-reveal space-y-4 rounded-2xl border border-border p-6 md:p-8">
          <p className="vela-pill">
            VELASEED · Venture Diagnosis Engine
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Diagnostica startups con criterio de crecimiento real
          </h1>
          <p className="text-sm vela-muted">
            Evalúa modelo, etapa y señales operativas para tomar decisiones de incubación, aceleración o reestructuración.
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
            <Link href="/dashboard" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
              Ir al dashboard
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

        <section className="grid gap-6 lg:grid-cols-3 vela-stagger">
          <form
            onSubmit={onSubmit}
            className="vela-hover-lift space-y-4 rounded-xl border border-zinc-200 p-5 lg:col-span-2 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Business Scan de fundadores</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm md:col-span-2">
                Nombre de la empresa
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.companyName}
                  onChange={(e) => setFormData((current) => ({ ...current, companyName: e.target.value }))}
                  placeholder="Ej. AgroNova SAS"
                />
              </label>

              <label className="block text-sm">
                Sector
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.companySector}
                  onChange={(e) => setFormData((current) => ({ ...current, companySector: e.target.value }))}
                  placeholder="Ej. Agrotech"
                />
              </label>

              <label className="block text-sm">
                Modelo de negocio
                <select
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.businessModel}
                  onChange={(e) => setFormData((current) => ({ ...current, businessModel: e.target.value }))}
                >
                  <option value="other">Otro</option>
                  <option value="services">Servicios</option>
                  <option value="saas">SaaS</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="manufacturing">Manufactura</option>
                  <option value="education">Educación</option>
                  <option value="fintech">Fintech</option>
                  <option value="health">Health</option>
                  <option value="b2b">B2B</option>
                  <option value="b2c">B2C</option>
                  <option value="b2b2c">B2B2C</option>
                </select>
              </label>

              <label className="block text-sm">
                Etapa de desarrollo
                <select
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.companyStage}
                  onChange={(e) => setFormData((current) => ({ ...current, companyStage: e.target.value }))}
                >
                  <option value="idea">Idea</option>
                  <option value="validation">Validación</option>
                  <option value="mvp">MVP</option>
                  <option value="early_traction">Tracción temprana</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                  <option value="mature">Madura</option>
                  <option value="turnaround">Turnaround</option>
                </select>
              </label>

              <label className="block text-sm">
                Años de operación
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.yearsOperating}
                  onChange={(e) => updateNumber("yearsOperating", e.target.value)}
                />
              </label>

              <label className="block text-sm">
                Tamaño del equipo
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.teamSize}
                  onChange={(e) => updateNumber("teamSize", e.target.value)}
                />
              </label>

              <label className="block text-sm md:col-span-2">
                Trayectoria y evolución
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.trajectorySummary}
                  onChange={(e) => setFormData((current) => ({ ...current, trajectorySummary: e.target.value }))}
                  placeholder="Describe hitos, pivotes y avances de la empresa"
                />
              </label>

              <label className="block text-sm md:col-span-2">
                Retos críticos actuales
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  value={formData.challengeSummary}
                  onChange={(e) => setFormData((current) => ({ ...current, challengeSummary: e.target.value }))}
                  placeholder="Cuellos de botella en producto, equipo, mercado o finanzas"
                />
              </label>
            </div>

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
                className="vela-accent-button px-4 py-2 text-sm"
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

          <aside className="vela-hover-lift space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Resultado inteligente de escalabilidad</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Índice de Escalabilidad VELASEED (IEV)
            </p>
            <p className="vela-pulse inline-flex max-w-max rounded-xl bg-[rgba(216,78,42,0.08)] px-3 py-1 text-4xl font-bold">{resultadoApi?.iev ?? "-"}</p>
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

            <div className="pt-4">
              <h3 className="text-sm font-semibold">Evaluaciones recientes</h3>
              <ul className="mt-2 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                {recentEvaluations.length === 0 ? (
                  <li>Sin registros todavía.</li>
                ) : (
                  recentEvaluations.map((item) => (
                    <li key={item.id} className="rounded border border-zinc-200 p-2 dark:border-zinc-800">
                      <p className="font-medium text-zinc-700 dark:text-zinc-100">{item.companyName || "Empresa"}</p>
                      <p>{item.companyStage} · {item.businessModel}</p>
                      <p>IEV {item.iev} · {item.classification}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
