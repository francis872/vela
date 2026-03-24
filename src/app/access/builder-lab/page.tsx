"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Experiment = {
  id: string;
  title: string;
  stage: string;
  result: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
};

export default function BuilderLabPage() {
  const router = useRouter();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openingBoard, setOpeningBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadExperiments() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/builder-lab/experiments", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("No se pudo cargar Builder Lab");
      }

      const data: { experiments: Experiment[] } = await response.json();
      setExperiments(data.experiments);
    } catch {
      setError("No se pudieron cargar experimentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExperiments();
  }, []);

  const kpis = useMemo(() => {
    const total = experiments.length;
    const active = experiments.filter((exp) => exp.result.toLowerCase().includes("progreso")).length;
    const validated = experiments.filter((exp) => exp.result.toLowerCase().includes("validado")).length;

    return [
      { label: "Ideas en pipeline", value: String(total), detail: "Experimentos registrados" },
      { label: "Experimentos activos", value: String(active), detail: "En progreso" },
      { label: "MVP listos", value: String(validated), detail: "Con señal de validación" },
    ];
  }, [experiments]);

  async function createExperiment() {
    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const createResponse = await fetch("/api/builder-lab/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "Problema", result: "En progreso" }),
      });

      const createBody = (await createResponse.json().catch(() => ({}))) as {
        error?: string;
        experiment?: Experiment;
      };

      if (!createResponse.ok || !createBody.experiment) {
        throw new Error(createBody.error || "No se pudo crear el experimento");
      }

      await fetch("/api/quick-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionKey: "builder_create_experiment",
          module: "builder-lab",
          context: createBody.experiment.title,
        }),
      });

      setExperiments((prev) => [createBody.experiment!, ...prev]);
      setMessage(`Experimento creado: ${createBody.experiment.title}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el experimento.");
    } finally {
      setCreating(false);
    }
  }

  async function openMvpBoard() {
    setOpeningBoard(true);
    setError(null);

    await fetch("/api/quick-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionKey: "builder_open_mvp_board",
        module: "builder-lab",
      }),
    }).catch(() => null);

    router.push("/access/builder-lab/mvp-board");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · BUILDER LAB</p>
          <h1 className="text-3xl font-bold">Builder Lab</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Espacio para diseño de modelos de negocio, validación de hipótesis y prototipado inicial.
          </p>
        </header>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        <section className="grid gap-4 md:grid-cols-3">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{kpi.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Bitácora de experimentos</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Proyecto</th>
                  <th className="py-2 pr-4 font-medium">Etapa</th>
                  <th className="py-2 pr-4 font-medium">Resultado</th>
                  <th className="py-2 font-medium">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => (
                  <tr key={exp.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-2 pr-4">{exp.title}</td>
                    <td className="py-2 pr-4">{exp.stage}</td>
                    <td className="py-2 pr-4">{exp.result}</td>
                    <td className="py-2">{exp.createdByName}</td>
                  </tr>
                ))}
                {!loading && experiments.length === 0 ? (
                  <tr>
                    <td className="py-2" colSpan={4}>Sin experimentos aún. Usa “Crear nuevo experimento”.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {loading ? <p className="mt-2 text-xs text-zinc-500">Cargando experimentos...</p> : null}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Acciones rápidas</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createExperiment}
              disabled={creating}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-70"
            >
              {creating ? "Creando..." : "Crear nuevo experimento"}
            </button>
            <button
              type="button"
              onClick={openMvpBoard}
              disabled={openingBoard}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700 disabled:opacity-70"
            >
              {openingBoard ? "Abriendo..." : "Abrir tablero MVP"}
            </button>
          </div>
        </section>

        <div className="flex gap-3">
          <Link href="/vela" className="text-sm font-medium underline">Volver a VELA Home</Link>
          <Link href="/velaseed" className="text-sm font-medium underline">Ir a VELASEED</Link>
        </div>
      </main>
    </div>
  );
}
