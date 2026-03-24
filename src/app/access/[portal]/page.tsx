import Link from "next/link";
import { notFound } from "next/navigation";

const portalConfig = {
  velaseed: {
    title: "Portal VELASEED",
    description:
      "Accede al módulo de evaluación empresarial y scoring de escalabilidad.",
    next: "/velaseed",
    roles: "admin, analista, operador",
  },
  dashboard: {
    title: "Portal Dashboard Institucional",
    description:
      "Accede al tablero institucional con filtros, analítica y exportación de datos.",
    next: "/dashboard",
    roles: "admin, analista",
  },
  admin: {
    title: "Portal Admin",
    description:
      "Accede a gestión de usuarios, roles y acciones de administración de plataforma.",
    next: "/admin/users",
    roles: "admin",
  },
} as const;

type PortalKey = keyof typeof portalConfig;

export default async function PortalAccessPage({
  params,
}: {
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  const config = portalConfig[portal as PortalKey];

  if (!config) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-16 md:px-10">
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">
            Portal de acceso
          </p>
          <h1 className="text-3xl font-bold">{config.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {config.description}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Roles con acceso: {config.roles}
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex flex-wrap gap-3">
            <Link
              href={config.next}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Entrar al módulo
            </Link>
            <Link href="/access" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">
              Ver todos los portales
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
