import Link from "next/link";
import QuickActionButton from "@/components/quick-action-button";

const kpis = [
  { label: "Capital desplegado", value: "$1.8M", detail: "Ciclo actual" },
  { label: "Runway promedio", value: "13.6 meses", detail: "Portafolio activo" },
  { label: "Eficiencia operativa", value: "81%", detail: "Meta: 85%" },
];

const allocation = [
  { unit: "VELASEED", amount: "$420k", status: "Activo" },
  { unit: "Builder Lab", amount: "$360k", status: "Activo" },
  { unit: "Growth", amount: "$520k", status: "Monitoreo" },
  { unit: "Infraestructura", amount: "$500k", status: "Activo" },
];

export default function CapitalOpsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · CAPITAL & OPS</p>
          <h1 className="text-3xl font-bold">Capital y Operaciones</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Módulo para gestión financiera continua, decisiones operativas y control institucional.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{kpi.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Asignación por unidad</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {allocation.map((row) => (
              <li
                key={row.unit}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="font-medium">{row.unit}</span>
                <span>{row.amount}</span>
                <span className="text-zinc-500">{row.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Acciones operativas</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <QuickActionButton
              label="Aprobar reasignación"
              actionKey="capital_approve_reallocation"
              module="capital-ops"
              variant="primary"
            />
            <QuickActionButton
              label="Abrir comité financiero"
              actionKey="capital_open_committee"
              module="capital-ops"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <Link href="/vela" className="text-sm font-medium underline">Volver a VELA Home</Link>
          <Link href="/dashboard" className="text-sm font-medium underline">Ir al Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
