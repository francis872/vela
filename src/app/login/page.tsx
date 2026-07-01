"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const LAST_EMAIL_KEY = "vela-last-email";
const LAST_LOGIN_AT_KEY = "vela-last-login-at";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const portal = searchParams.get("portal");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  const portalLabel =
    portal === "velaseed"
      ? "Portal VELASEED"
      : portal === "dashboard"
        ? "Portal Dashboard"
        : portal === "admin"
          ? "Portal Admin"
          : "Acceso general";

      useEffect(() => {
        if (typeof window === "undefined") {
          return;
        }

        const rememberedEmail = window.localStorage.getItem(LAST_EMAIL_KEY);
        const rememberedLoginAt = window.localStorage.getItem(LAST_LOGIN_AT_KEY);

        if (rememberedEmail) {
          setEmail(rememberedEmail);
        }

        if (rememberedLoginAt) {
          setLastLoginAt(rememberedLoginAt);
        }

        const checkSession = async () => {
          try {
            const response = await fetch("/api/auth/me", { cache: "no-store" });
            if (response.ok) {
              const targetPath =
                nextPath && nextPath.length > 0 && nextPath !== "/"
                  ? nextPath
                  : "/vela";

              router.replace(targetPath);
              router.refresh();
            }
          } catch {
            // noop
          }
        };

        checkSession();
      }, [nextPath, router]);

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

      if (typeof window !== "undefined") {
        const nowIso = new Date().toISOString();
        window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
        window.localStorage.setItem(LAST_LOGIN_AT_KEY, nowIso);
        setLastLoginAt(nowIso);
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
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "1.5rem" }}>
          <span style={{ color: "var(--accent)", fontSize: "1.2rem" }}>◈</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink)" }}>VELA OS</span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: "0.5rem" }}>Iniciar sesión</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-3)" }}>
          {portal ? `Acceso a ${portalLabel}` : "Bienvenido de vuelta"}
        </p>
      </div>

      {/* Form card */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.375rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                fontSize: "0.88rem", color: "var(--ink)", outline: "none",
                width: "100%",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", color: "var(--ink-2)" }}>Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border-mid)",
                borderRadius: "0.25rem", padding: "0.6rem 0.75rem",
                fontSize: "0.88rem", color: "var(--ink)", outline: "none",
                width: "100%",
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
            {loading ? "Validando..." : "Entrar"}
          </button>

          {error && (
            <p style={{ fontSize: "0.78rem", color: "var(--red)", margin: 0 }}>{error}</p>
          )}
          {lastLoginAt && (
            <p style={{ fontSize: "0.65rem", color: "var(--ink-3)", margin: 0 }}>
              Último acceso: {new Date(lastLoginAt).toLocaleString("es-ES")}
            </p>
          )}

          <p style={{ margin: 0, textAlign: "right" }}>
            <Link href="/forgot-password" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 600 }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </form>
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--ink-3)", textAlign: "center" }}>
        ¿Sin cuenta?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath || "")}${portal ? `&portal=${portal}` : ""}`}
          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
        >
          Crear cuenta gratis
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <Suspense fallback={<p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--ink-3)" }}>Cargando acceso...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
