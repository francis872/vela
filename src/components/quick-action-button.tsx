"use client";

import { useState } from "react";

type QuickActionButtonProps = {
  label: string;
  actionKey: string;
  module: "lums" | "insights" | "builder-lab" | "capital-ops";
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

  const onClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await fetch("/api/quick-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionKey, module, context }),
      });
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variantClasses =
    variant === "primary"
      ? "bg-foreground text-background border-foreground"
      : "bg-transparent text-foreground border-zinc-300 dark:border-zinc-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`rounded-lg border font-semibold transition ${sizeClasses} ${variantClasses} disabled:opacity-60`}
    >
      {loading ? "Guardando..." : label}
    </button>
  );
}
