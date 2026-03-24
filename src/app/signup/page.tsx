"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "";
  const portal = searchParams.get("portal");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const portalLabel = useMemo(() => {
    if (portal === "velaseed") return "Portal VELASEED";
    if (portal === "dashboard") return "Portal Dashboard";
    if (portal === "admin") return "Portal Admin";
    return "Acceso general";
  }, [portal]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo crear la cuenta");
      }

      setSuccess("Cuenta creada. Ahora inicia sesión para continuar.");
      setTimeout(() => {
        const query = new URLSearchParams();
        if (nextPath) {
          query.set("next", nextPath);
        }
        if (portal) {
          query.set("portal", portal);
        }

        const path = query.toString() ? `/login?${query.toString()}` : "/login";
        router.push(path);
      }, 700);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-md space-y-6 px-6 py-16 md:px-10">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">VELA Access</p>
          <h1 className="text-3xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Flujo separado de autenticación para {portalLabel}.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <label className="block text-sm">
            Nombre
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            Contraseña
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
        </form>

        <div className="flex justify-center gap-3 text-sm">
          <Link
            href={(() => {
              const query = new URLSearchParams();
              if (nextPath) {
                query.set("next", nextPath);
              }
              if (portal) {
                query.set("portal", portal);
              }

              return query.toString() ? `/login?${query.toString()}` : "/login";
            })()}
            className="underline"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-center text-sm">Cargando registro...</p>}>
      <SignupForm />
    </Suspense>
  );
}
