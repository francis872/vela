import Link from "next/link";
import QuickActionButton from "@/components/quick-action-button";
import AdminCreateContentLink from "@/components/admin-create-content-link";
import { ensureEcosystemSeedContent, listEcosystemContent } from "@/lib/ecosystem-content-service";
import { humanFeaturedTalks as fallbackTalks, humanLearningPaths as fallbackPaths } from "@/lib/ecosystem-seed";

export const dynamic = "force-dynamic";

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

export default async function InsightsPage() {
  let humanLearningPaths = [] as Array<{
    id: string;
    title: string;
    summary: string;
    detail: string | null;
  }>;
  let humanFeaturedTalks = [] as Array<{
    id: string;
    title: string;
    summary: string;
    detail: string | null;
  }>;

  try {
    await ensureEcosystemSeedContent();
    const content = await listEcosystemContent("human");
    humanLearningPaths = content
      .filter((item: { category: string }) => item.category === "path")
      .map((item: { id: string; title: string; summary: string; detail: string | null }) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        detail: item.detail,
      }));
    humanFeaturedTalks = content
      .filter((item: { category: string }) => item.category === "talk")
      .map((item: { id: string; title: string; summary: string; detail: string | null }) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        detail: item.detail,
      }));
  } catch {
    humanLearningPaths = fallbackPaths.map((item, index) => ({
      id: `fallback-path-${index}`,
      title: item.stage,
      summary: item.focus,
      detail: item.rhythm,
    }));
    humanFeaturedTalks = fallbackTalks.map((item, index) => ({
      id: `fallback-talk-${index}`,
      title: item.title,
      summary: `${item.speaker} · ${item.topic}`,
      detail: item.length,
    }));
  }

  return (
    <div className="vela-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-10">
        <header className="vela-reveal space-y-3 rounded-2xl border border-border p-6 md:p-8">
          <p className="vela-pill">HUMAN · TED x Platzi Engine</p>
          <h1 className="text-3xl font-bold md:text-5xl">Aprender, pensar y ejecutar como founder</h1>
          <p className="text-sm vela-muted">
            Human combina talks de alto impacto con rutas formativas aplicadas para convertir conocimiento en decisiones.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <AdminCreateContentLink module="human" />
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

        <section className="vela-reveal rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Rutas Human por etapa</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {humanLearningPaths.map((track) => (
              <article key={track.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <p className="font-semibold">{track.title}</p>
                <p className="mt-1 text-zinc-500">{track.summary}</p>
                <p className="mt-2 text-xs font-medium text-zinc-500">Ritmo: {track.detail ?? "Por definir"}</p>
              </article>
            ))}
            {humanLearningPaths.length === 0 ? (
              <p className="text-zinc-500">Sin rutas cargadas.</p>
            ) : null}
          </div>
        </section>

        <section className="vela-reveal rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Talks accionables</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {humanFeaturedTalks.map((talk) => (
              <li key={talk.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div>
                  <p className="font-medium">{talk.title}</p>
                  <p className="text-zinc-500">{talk.summary} · {talk.detail ?? "Duracion por definir"}</p>
                </div>
                <button type="button" className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700">
                  Ver talk
                </button>
              </li>
            ))}
            {humanFeaturedTalks.length === 0 ? (
              <li className="text-zinc-500">Sin talks cargadas.</li>
            ) : null}
          </ul>
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
          <h2 className="font-semibold">Acciones Human</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <QuickActionButton
              label="Generar brief de aprendizaje"
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

        <div className="flex flex-wrap gap-3">
          <Link href="/vela" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Volver a VELA Home</Link>
          <Link href="/dashboard" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Ir al Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
