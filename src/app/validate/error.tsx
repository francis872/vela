"use client";

export default function ValidateError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="os-card" role="alert" style={{ margin: "2rem", maxWidth: 640 }}>
      <h2 style={{ color: "var(--ink)", marginBottom: "0.5rem" }}>Validate no pudo cargar</h2>
      <p style={{ color: "var(--ink-2)", marginBottom: "1rem" }}>
        La evidencia de validación no está disponible en este momento. Reintenta sin perder la sesión ni el resto de VELA.
      </p>
      <button type="button" className="btn-primary" onClick={() => reset()}>
        Reintentar
      </button>
    </div>
  );
}
