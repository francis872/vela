import Link from "next/link";
import QuickActionButton from "@/components/quick-action-button";

const kpis = [
  { label: "Usuarios activos", value: "1,248", detail: "+8% último mes" },
  { label: "Rutas completadas", value: "372", detail: "Onboarding + roles" },
  { label: "Score madurez", value: "78/100", detail: "Promedio institucional" },
];

const cohortes = [
  { equipo: "Builder Core", avance: "92%", estado: "Alto" },
  { equipo: "Growth Unit", avance: "81%", estado: "Medio" },
  { equipo: "Capital Ops", avance: "74%", estado: "Medio" },
  { equipo: "Velaseed Field", avance: "61%", estado: "Bajo" },
];

export default function LumsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 md:px-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · LUMS</p>
          <h1 className="text-3xl font-bold">LUMS · Learning & User Maturity System</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Centro para seguimiento de madurez de usuarios, rutas de aprendizaje y progreso institucional.
          </p>
        </header>

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
          <h2 className="font-semibold">Seguimiento por cohorte</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Equipo</th>
                  <th className="py-2 pr-4 font-medium">Avance</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cohortes.map((row) => (
                  <tr key={row.equipo} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-2 pr-4">{row.equipo}</td>
                    <td className="py-2 pr-4">{row.avance}</td>
                    <td className="py-2">{row.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">Acciones rápidas</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <QuickActionButton
              label="Asignar ruta formativa"
              actionKey="lums_assign_route"
              module="lums"
              variant="primary"
            />
            <QuickActionButton
              label="Generar reporte de madurez"
              actionKey="lums_generate_report"
              module="lums"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <Link href="/vela" className="text-sm font-medium underline">Volver a VELA Home</Link>
          <Link href="/access" className="text-sm font-medium underline">Ir al mapa de módulos</Link>
        </div>
      </main>
    </div>
  );
}
