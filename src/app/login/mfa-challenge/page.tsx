"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function MfaChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Código incorrecto");
      }

      router.replace("/vela");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <div className="mb-5 text-center">
          <span style={{ color: "var(--accent)" }}>◈</span>
          <h1 className="mt-2 text-xl font-bold tracking-tight">Verificación de dos pasos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Introduce el código de tu aplicación de autenticación o un código de recuperación.
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-4 py-2.5 text-center text-lg tracking-[0.4em] outline-none focus:border-[var(--accent)]"
          required
        />

        {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Verificando…" : "Verificar"}
        </button>
      </form>
    </div>
  );
}
