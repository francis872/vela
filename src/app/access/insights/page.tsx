import Link from "next/link";
import QuickActionButton from "@/components/quick-action-button";

const kpis = [
  { label: "Señales activas", value: "19", detail: "12 alta prioridad" },
  { label: "Nuevas verticales", value: "5", detail: "Últimos 30 días" },
  { label: "Alertas críticas", value: "3", detail: "Revisión inmediata" },
];

const signals = [
  { title: "Health AI B2B", confidence: "87%", action: "Analizar" },
  { title: "Infra fintech pymes", confidence: "82%", action: "Priorizar" },
  { title: "Logística urbana", confidence: "74%", action: "Validar" },
  { title: "SaaS GovTech", confidence: "69%", action: "Monitorear" },
];

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · INSIGHTS</p>
          <h1 className="text-3xl font-bold">Inteligencia & Insight</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Radar de señales, tendencias de mercado y hallazgos accionables para decisiones estratégicas.
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
          <h2 className="font-semibold">Radar de señales</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {signals.map((signal) => (
              <li
                key={signal.title}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium">{signal.title}</p>
                  <p className="text-zinc-500">Confianza: {signal.confidence}</p>
                </div>
                <QuickActionButton
                  label={signal.action}
                  actionKey="insights_signal_action"
                  module="insights"
                  context={signal.title}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Acciones estratégicas</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <QuickActionButton
              label="Generar brief de oportunidad"
              actionKey="insights_generate_brief"
              module="insights"
              variant="primary"
            />
            <QuickActionButton
              label="Exportar señales"
              actionKey="insights_export_signals"
              module="insights"
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
