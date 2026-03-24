import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-16 text-center md:px-10">
        <h1 className="text-3xl font-bold">Acceso denegado</h1>
        <p className="text-zinc-600 dark:text-zinc-300">
          Tu rol actual no tiene permisos para acceder a este módulo.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">
            Ir al inicio
          </Link>
          <Link href="/login" className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">
            Cambiar sesión
          </Link>
        </div>
      </main>
    </div>
  );
}
