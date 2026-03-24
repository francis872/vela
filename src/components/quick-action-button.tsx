"use client";

import { useState } from "react";
import type { QuickActionKey, QuickActionModule } from "@/lib/quick-actions";

type QuickActionButtonProps = {
  label: string;
  actionKey: QuickActionKey;
  module: QuickActionModule;
  context?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
};

export default function QuickActionButton({
  label,
  actionKey,
  module,
  context,
  variant = "secondary",
  size = "md",
}: QuickActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const baseClass =
    "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70";
  const variantClass =
    variant === "primary"
      ? "bg-foreground text-background"
      : "border border-zinc-300 dark:border-zinc-700";
  const sizeClass = size === "sm" ? "px-3 py-1 text-xs" : "";

  async function onClick() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/quick-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionKey, module, context }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        execution?: { message?: string };
      };

      if (!response.ok) {
        setError(body.error || "No se pudo ejecutar la acción.");
        return;
      }

      setMessage(body.execution?.message || "Acción ejecutada.");
    } catch {
      setError("No se pudo ejecutar la acción.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`${baseClass} ${variantClass} ${sizeClass}`.trim()}
      >
        {loading ? "Procesando..." : label}
      </button>
      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
