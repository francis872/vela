"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminCreateContentLink from "@/components/admin-create-content-link";

type Experiment = {
  id: string;
  title: string;
  stage: string;
  result: string;
  createdByName: string;
  createdAt: string;
};

type EcosystemContent = {
  id: string;
  title: string;
  summary: string;
  detail: string | null;
  category: string;
};

const columns = ["Problema", "Solución", "Canal", "Precio"] as const;

const repoSignals = [
  { label: "Repos activos", value: "12", detail: "3 con release esta semana" },
  { label: "Experimentos abiertos", value: "27", detail: "9 listos para decisión" },
  { label: "Merge readiness", value: "84%", detail: "Flujo saludable" },
];

export default function BuilderMvpBoardPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [spaceTemplates, setSpaceTemplates] = useState<EcosystemContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/builder-lab/experiments", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("No se pudo cargar tablero");
        }

        const data: { experiments: Experiment[] } = await response.json();
        setExperiments(data.experiments);

        const templateResponse = await fetch("/api/ecosystem-content?module=space", { cache: "no-store" });
        if (templateResponse.ok) {
          const templatePayload: { content: EcosystemContent[] } = await templateResponse.json();
          setSpaceTemplates(templatePayload.content.filter((item) => item.category === "repo-template"));
        }
      } catch {
        setError("No se pudo cargar el tablero MVP.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      column,
      items: experiments.filter((exp) => exp.stage.toLowerCase() === column.toLowerCase()),
    }));
  }, [experiments]);

  return (
    <div className="vela-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 md:px-10">
        <header className="vela-reveal space-y-3 rounded-2xl border border-border p-6 md:p-8">
          <p className="vela-pill">SPACE · Repository System</p>
          <h1 className="text-3xl font-bold md:text-5xl">Repositorio operativo de startups</h1>
          <p className="text-sm vela-muted">
            Space organiza experimentos como un sistema tipo repositorio: decisiones, estados y evidencia por etapa.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/access/builder-lab" className="rounded-lg border border-border px-3 py-2 font-semibold">Volver a Builder Lab</Link>
            <Link href="/access" className="rounded-lg border border-border px-3 py-2 font-semibold">Centro de navegación</Link>
            <AdminCreateContentLink module="space" className="vela-accent-button px-3 py-2" />
          </div>
        </header>

        <section className="vela-stagger grid gap-4 sm:grid-cols-3">
          {repoSignals.map((signal) => (
            <article key={signal.label} className="vela-hover-lift rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{signal.label}</p>
              <p className="mt-2 text-2xl font-bold">{signal.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{signal.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Plantillas de repositorio</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {spaceTemplates.map((template) => (
              <li key={template.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div>
                  <p className="font-medium">{template.title}</p>
                  <p className="text-zinc-500">{template.summary}</p>
                </div>
                <span className="rounded-full border border-zinc-300 px-2 py-1 text-xs font-semibold uppercase dark:border-zinc-700">
                  {template.detail ?? "active"}
                </span>
              </li>
            ))}
            {spaceTemplates.length === 0 ? <li className="text-zinc-500">Sin plantillas cargadas.</li> : null}
          </ul>
        </section>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {loading ? <p className="text-sm text-zinc-500">Cargando tablero...</p> : null}

        <section className="grid gap-4 lg:grid-cols-4">
          {grouped.map((group) => (
            <article key={group.column} className="vela-hover-lift rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{group.column}</h2>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-zinc-500">{item.result}</p>
                    <p className="text-zinc-500">by {item.createdByName}</p>
                    <p className="text-zinc-500">{new Date(item.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>
                ))}
                {group.items.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sin items en esta etapa.</p>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Flujo recomendado en Space</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
            <li>1. Crear hipótesis por startup y etapa.</li>
            <li>2. Registrar evidencia y resultado de experimento.</li>
            <li>3. Consolidar decisiones para pasar a siguiente etapa.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
