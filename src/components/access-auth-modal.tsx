"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

type AccessAuthModalProps = {
  triggerLabel?: string;
};

export default function AccessAuthModal({ triggerLabel = "Iniciar sesión" }: AccessAuthModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@vela.local");
  const [password, setPassword] = useState("admin123");

  const title = useMemo(() => {
    if (mode === "signup") {
      return "Crear cuenta";
    }

    return "Iniciar sesión";
  }, [mode]);

  function openLogin() {
    setError(null);
    setSuccess(null);
    setMode("login");
    setOpen(true);
  }

  function openSignup() {
    setError(null);
    setSuccess(null);
    setMode("signup");
    setOpen(true);
  }

  function closeModal() {
    if (loading) {
      return;
    }

    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "No se pudo iniciar sesión");
        }

        setOpen(false);
        router.replace("/vela");
        router.refresh();
        return;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la cuenta");
      }

      setSuccess("Cuenta creada correctamente. Ahora inicia sesión.");
      setMode("login");
      if (!password) {
        setPassword("admin123");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openLogin}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-background p-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-zinc-500">VELA Access</p>
                <h2 className="text-2xl font-bold">{title}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold dark:border-zinc-700"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              {mode === "signup" ? (
                <label className="block text-sm">
                  Nombre
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                  />
                </label>
              ) : null}

              <label className="block text-sm">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                />
              </label>

              <label className="block text-sm">
                Contraseña
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-70"
              >
                {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
              </button>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
            </form>

            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
              {mode === "login" ? (
                <p>
                  ¿No tienes sesión?{" "}
                  <button
                    type="button"
                    onClick={openSignup}
                    className="font-semibold underline"
                  >
                    Crear cuenta
                  </button>
                </p>
              ) : (
                <p>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={openLogin}
                    className="font-semibold underline"
                  >
                    Iniciar sesión
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
