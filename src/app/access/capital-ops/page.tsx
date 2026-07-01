import Link from "next/link";
import QuickActionButton from "@/components/quick-action-button";
import AdminCreateContentLink from "@/components/admin-create-content-link";
import { ensureEcosystemSeedContent, listEcosystemContent } from "@/lib/ecosystem-content-service";
import { adventureTheses as fallbackTheses } from "@/lib/ecosystem-seed";

export const dynamic = "force-dynamic";

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

const investmentTracks = [
  { track: "Discovery Capital", mandate: "Cheques de validación temprana", risk: "Alto" },
  { track: "Execution Capital", mandate: "Financiar tracción y unit economics", risk: "Medio" },
  { track: "Scale Capital", mandate: "Expansión y defensibilidad", risk: "Controlado" },
];

export default async function CapitalOpsPage() {
  let adventureTheses = [] as Array<{
    id: string;
    title: string;
    summary: string;
    detail: string | null;
  }>;

  try {
    await ensureEcosystemSeedContent();
    const content = await listEcosystemContent("adventure");
    adventureTheses = content
      .filter((item: { category: string }) => item.category === "thesis")
      .map((item: { id: string; title: string; summary: string; detail: string | null }) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        detail: item.detail,
      }));
  } catch {
    adventureTheses = fallbackTheses.map((item, index) => ({
      id: `fallback-thesis-${index}`,
      title: item.title,
      summary: `Horizonte ${item.horizon} · Conviccion ${item.conviction}`,
      detail: `Riesgo ${item.riskBand}`,
    }));
  }

  return (
    <div className="vela-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-10">
        <header className="vela-reveal space-y-3 rounded-2xl border border-border p-6 md:p-8">
          <p className="vela-pill">VELA ADVENTURE · Capital Strategy</p>
          <h1 className="text-3xl font-bold md:text-5xl">Capital inteligente para crecimiento disciplinado</h1>
          <p className="text-sm vela-muted">
            Vela Adventure fusiona visión de venture capital con rigor financiero institucional para decidir mejor.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <AdminCreateContentLink module="adventure" />
        </div>

        <section className="vela-stagger grid gap-4 md:grid-cols-3">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="vela-hover-lift rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{kpi.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Mandatos de inversión</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {investmentTracks.map((track) => (
              <li key={track.track} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="font-medium">{track.track}</p>
                <p className="text-zinc-500">{track.mandate}</p>
                <p className="text-zinc-500">Riesgo: {track.risk}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Tesis activas del comité</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {adventureTheses.map((thesis) => (
              <li key={thesis.id} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="font-medium">{thesis.title}</p>
                <p className="text-zinc-500">
                  {thesis.summary} · {thesis.detail ?? "Sin detalle"}
                </p>
              </li>
            ))}
            {adventureTheses.length === 0 ? <li className="text-zinc-500">Sin tesis cargadas.</li> : null}
          </ul>
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
          <h2 className="font-semibold">Acciones de comité</h2>
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

        <div className="flex flex-wrap gap-3">
          <Link href="/vela" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Volver a VELA Home</Link>
          <Link href="/dashboard" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Ir al Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
