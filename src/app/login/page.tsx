"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const portal = searchParams.get("portal");

  const [email, setEmail] = useState("admin@vela.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portalLabel =
    portal === "velaseed"
      ? "Portal VELASEED"
      : portal === "dashboard"
        ? "Portal Dashboard"
        : portal === "admin"
          ? "Portal Admin"
          : "Acceso general";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo iniciar sesión");
      }

      const targetPath =
        nextPath && nextPath.length > 0 && nextPath !== "/"
          ? nextPath
          : "/vela";

      router.replace(targetPath);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="space-y-2 text-center">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">VELA Access</p>
        <h1 className="text-3xl font-bold">Iniciar sesión</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Flujo separado de autenticación para {portalLabel}.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <label className="block text-sm">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Contraseña
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
        >
          {loading ? "Validando..." : "Entrar"}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <section className="rounded-xl border border-zinc-200 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
        <p className="font-semibold">Credenciales de prueba:</p>
        <p>admin@vela.local / admin123</p>
        <p>analista@vela.local / analista123</p>
        <p>operador@vela.local / operador123</p>
        <p className="mt-3">
          ¿Sin cuenta?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(nextPath || "")}${portal ? `&portal=${portal}` : ""}`}
            className="underline"
          >
            Crear cuenta
          </Link>
        </p>
      </section>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-md space-y-6 px-6 py-16 md:px-10">
        <Suspense fallback={<p className="text-center text-sm">Cargando acceso...</p>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
