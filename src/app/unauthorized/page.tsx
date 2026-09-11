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
        <p style={{ fontSize: "0.95rem", color: "var(--ink-3)", lineHeight: 1.8, marginBottom: "1.25rem" }}>
          Tu sesión actual no está autorizada para ver esta área de VELA. Si crees que debería ser así, ponte en contacto con el equipo y vuelve a intentarlo.
        </p>
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.1rem", border: "1px solid rgba(232,92,45,0.2)", borderRadius: "0.65rem", background: "rgba(232,92,45,0.06)" }}>
          <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>Solicitud de acceso o revisión de permisos</p>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.92rem", color: "var(--ink-3)", lineHeight: 1.6 }}>
            Si consideras que este acceso debería estar habilitado, puedes reservar una llamada breve con nuestro equipo o escribirnos directamente para revisar tu caso.
          </p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <a
              href="https://www.linkedin.com/company/vela-ai/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.8rem 1rem",
                borderRadius: "0.35rem",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Agendar llamada
            </a>
            <a
              href="mailto:hola@vela.app?subject=Solicitud%20de%20acceso%20VELA"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.8rem 1rem",
                borderRadius: "0.35rem",
                background: "transparent",
                border: "1px solid var(--border-mid)",
                color: "var(--ink-2)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Escribir al equipo
            </a>
          </div>
        </div>
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
