"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Experiment = {
  id: string;
  title: string;
  stage: string;
  result: string;
  createdByName: string;
  createdAt: string;
};

const columns = ["Problema", "Solución", "Canal", "Precio"] as const;

export default function BuilderMvpBoardPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
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
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 md:px-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · BUILDER LAB</p>
          <h1 className="text-3xl font-bold">Tablero MVP</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Vista rápida de experimentos organizados por etapa de validación.
          </p>
          <div className="flex gap-3 text-sm">
            <Link href="/access/builder-lab" className="font-medium underline">Volver a Builder Lab</Link>
            <Link href="/access" className="font-medium underline">Centro de navegación</Link>
          </div>
        </header>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {loading ? <p className="text-sm text-zinc-500">Cargando tablero...</p> : null}

        <section className="grid gap-4 lg:grid-cols-4">
          {grouped.map((group) => (
            <article key={group.column} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{group.column}</h2>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-zinc-500">{item.result}</p>
                    <p className="text-zinc-500">{item.createdByName}</p>
                  </div>
                ))}
                {group.items.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sin items en esta etapa.</p>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
