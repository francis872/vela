import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--ink)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <main style={{
        width: "100%",
        maxWidth: 640,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        padding: "2rem",
        boxShadow: "0 18px 55px rgba(0,0,0,0.16)",
        textAlign: "center",
      }}>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.75rem", borderRadius: "999px", background: "rgba(232,92,45,0.12)", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.12em", fontSize: "0.75rem" }}>
            ACCESO DENEGADO
          </div>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "0.75rem" }}>No tienes permiso para este módulo</h1>
        <p style={{ fontSize: "0.95rem", color: "var(--ink-3)", lineHeight: 1.8, marginBottom: "1.75rem" }}>
          Tu sesión actual no está autorizada para ver esta área de VELA. Si crees que debería ser así, ponte en contacto con el equipo y vuelve a intentarlo.
        </p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link
            href="/"
            style={{
              minWidth: 150,
              background: "transparent",
              border: "1px solid var(--border-mid)",
              borderRadius: "0.35rem",
              color: "var(--ink-2)",
              padding: "0.85rem 1.1rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Ir al inicio
          </Link>
          <Link
            href="/login"
            style={{
              minWidth: 150,
              background: "var(--accent)",
              border: "none",
              borderRadius: "0.35rem",
              color: "#fff",
              padding: "0.85rem 1.1rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Cambiar sesión
          </Link>
        </div>
      </main>
    </div>
  );
}
