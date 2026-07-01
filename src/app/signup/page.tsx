"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const LAST_EMAIL_KEY = "vela-last-email";
const LAST_NAME_KEY  = "vela-last-name";

function SignupForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const nextPath    = searchParams.get("next") || "";
  const portal      = searchParams.get("portal");

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedEmail = window.localStorage.getItem(LAST_EMAIL_KEY);
    const savedName  = window.localStorage.getItem(LAST_NAME_KEY);
    if (savedEmail) setEmail(savedEmail);
    if (savedName)  setName(savedName);
  }, []);

  const loginHref = (() => {
    const q = new URLSearchParams();
    if (nextPath) q.set("next", nextPath);
    if (portal)   q.set("portal", portal);
    return q.toString() ? `/login?${q.toString()}` : "/login";
  })();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      /* 1. Register */
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const regData = await regRes.json().catch(() => ({})) as { error?: string };
      if (!regRes.ok) throw new Error(regData.error || "No se pudo crear la cuenta");

      /* 2. Auto-login */
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
        window.localStorage.setItem(LAST_NAME_KEY,  name.trim());
      }

      if (!loginRes.ok) {
        /* Fallback if auto-login fails — redirect to login */
        router.push(loginHref);
        return;
      }

      const target = nextPath && nextPath !== "/" ? nextPath : "/vela";
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      {/* Logotype */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "1.5rem" }}>
        <span style={{ color: "var(--accent)", fontSize: "1.2rem" }}>◈</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink)" }}>VELA OS</span>
      </div>

      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: "0.5rem" }}>
        Crear cuenta
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--ink-3)", marginBottom: "2rem" }}>
        {portal ? `Acceso a ${portal}` : "Comienza a operar tu startup"}
      </p>

      {/* Form card */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "0.375rem", padding: "1.5rem", textAlign: "left",
        display: "flex", flexDirection: "column", gap: "1rem",
        marginBottom: "1.25rem",
      }}>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", color: "var(--ink-2)" }}>Nombre</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border-mid)",
                borderRadius: "0.25rem", padding: "0.6rem 0.75rem",
                fontSize: "0.88rem", color: "var(--ink)", outline: "none", width: "100%",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", color: "var(--ink-2)" }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border-mid)",
                borderRadius: "0.25rem", padding: "0.6rem 0.75rem",
                fontSize: "0.88rem", color: "var(--ink)", outline: "none", width: "100%",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", color: "var(--ink-2)" }}>Contraseña</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border-mid)",
                borderRadius: "0.25rem", padding: "0.6rem 0.75rem",
                fontSize: "0.88rem", color: "var(--ink)", outline: "none", width: "100%",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "var(--surface-3)" : "var(--accent)",
              color: "#fff", border: "none", borderRadius: "0.25rem",
              padding: "0.7rem 1rem", fontSize: "0.88rem", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.03em",
              width: "100%", transition: "background 140ms ease",
            }}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          {error && (
            <p style={{ fontSize: "0.78rem", color: "var(--red)", margin: 0 }}>{error}</p>
          )}
        </form>
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>
        ¿Ya tienes cuenta?{" "}
        <Link href={loginHref} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Suspense fallback={<p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--ink-3)" }}>Cargando...</p>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
