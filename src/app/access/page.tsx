"use client";

import Link from "next/link";
 
const modules = [
  {
    title: "VELASEED",
    description: "Evaluación y escalabilidad de emprendimientos.",
    href: "/velaseed",
  },
  {
    title: "Dashboard Institucional",
    description: "Métricas, filtros, exportaciones y monitoreo del portafolio.",
    href: "/dashboard",
  },
  {
    title: "Builder Lab",
    description: "Diseño de modelos, experimentación y tablero MVP.",
    href: "/access/builder-lab",
  },
  {
    title: "Inteligencia & Insight",
    description: "Señales estratégicas, tendencias y decisiones de priorización.",
    href: "/access/insights",
  },
  {
    title: "LUMS",
    description: "Madurez de usuarios y rutas de aprendizaje.",
    href: "/access/lums",
  },
  {
    title: "Capital y Operaciones",
    description: "Asignación de capital y control operativo continuo.",
    href: "/access/capital-ops",
  },
  {
    title: "Admin",
    description: "Gestión de usuarios, roles y auditoría.",
    href: "/admin/users",
  },
];

export default function AccessPortalsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · MODULE MAP</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Mapa único de módulos
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
            Navegación simplificada para evitar ciclos: selecciona un módulo y opera.
            El retorno principal siempre es VELA Home.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/vela" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">
              Volver a VELA Home
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h2 className="text-lg font-semibold">{module.title}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {module.description}
              </p>
              <Link
                href={module.href}
                className="mt-4 inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
              >
                Abrir módulo
              </Link>
            </article>
          ))}
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
            className="text-sm font-medium underline"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    </div>
  );
}
