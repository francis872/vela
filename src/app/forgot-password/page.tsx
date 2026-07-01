"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo procesar la solicitud");
      }

      setMessage("Si el email existe, enviamos instrucciones para recuperar tu acceso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ingresa tu correo y te enviaremos una ruta de recuperación.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar instrucciones"}
          </button>
        </form>

        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <p className="mt-4 text-sm text-zinc-400">
          <Link href="/login" className="font-semibold text-foreground hover:underline">
            Volver a login
          </Link>
        </p>
      </div>
    </div>
  );
}
