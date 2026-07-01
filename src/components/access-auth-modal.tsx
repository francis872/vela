"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const LAST_EMAIL_KEY = "vela-last-email";
const LAST_NAME_KEY = "vela-last-name";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rememberedEmail = window.localStorage.getItem(LAST_EMAIL_KEY);
    const rememberedName = window.localStorage.getItem(LAST_NAME_KEY);

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }

    if (rememberedName) {
      setName(rememberedName);
    }
  }, []);

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

        if (typeof window !== "undefined") {
          window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
          if (name.trim().length > 0) {
            window.localStorage.setItem(LAST_NAME_KEY, name.trim());
          }
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

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
        window.localStorage.setItem(LAST_NAME_KEY, name.trim());
      }

      /* Auto-login after register */
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        setOpen(false);
        router.replace("/vela");
        router.refresh();
        return;
      }

      /* Fallback if auto-login fails */
      setSuccess("Cuenta creada correctamente. Inicia sesión para continuar.");
      setMode("login");
      setPassword("");
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
        style={{
          background: "var(--accent)", color: "#fff", border: "none",
          borderRadius: "0.25rem", padding: "0.65rem 1.25rem",
          fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
          letterSpacing: "0.03em", transition: "background 140ms ease",
        }}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.65)", padding: "1rem",
        }}>
          <div style={{
            width: "100%", maxWidth: 400,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "0.5rem", padding: "1.5rem",
            display: "flex", flexDirection: "column", gap: "1.25rem",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--accent)", fontSize: "1rem" }}>◈</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink)" }}>VELA OS</span>
                </div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>{title}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border-mid)",
                  borderRadius: "0.25rem", padding: "0.3rem 0.6rem",
                  fontSize: "0.72rem", fontWeight: 600, color: "var(--ink-2)", cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {mode === "signup" ? (
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
              ) : null}

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
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
                {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
              </button>

              {error   && <p style={{ fontSize: "0.78rem", color: "var(--red)",   margin: 0 }}>{error}</p>}
              {success && <p style={{ fontSize: "0.78rem", color: "var(--green)", margin: 0 }}>{success}</p>}
            </form>

            {/* Mode toggle */}
            <p style={{ fontSize: "0.78rem", color: "var(--ink-3)", margin: 0 }}>
              {mode === "login" ? (
                <>
                  ¿Sin cuenta?{" "}
                  <button type="button" onClick={openSignup} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: "inherit" }}>
                    Crear cuenta
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button type="button" onClick={openLogin} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: "inherit" }}>
                    Iniciar sesión
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
