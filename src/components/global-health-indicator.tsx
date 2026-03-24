"use client";

import { useEffect, useState } from "react";

type HealthSnapshot = {
  status: "ok" | "degraded";
  checkedAt: string;
  database: {
    status: "up" | "down";
    latencyMs?: number;
  };
};

export default function GlobalHealthIndicator() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as HealthSnapshot | null;

        if (!active || !payload) {
          return;
        }

        setHealth(payload);
      } catch {
        if (!active) {
          return;
        }

        setHealth({
          status: "degraded",
          checkedAt: new Date().toISOString(),
          database: { status: "down", latencyMs: 0 },
        });
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const up = health?.database.status === "up";

  return (
    <div className="fixed right-3 top-3 z-[60] rounded-full border border-zinc-300 bg-background/95 px-3 py-1 text-xs font-semibold shadow backdrop-blur dark:border-zinc-700">
      <span className={up ? "text-emerald-600" : "text-red-500"}>
        {up ? `● DB up · ${health?.database.latencyMs ?? 0}ms` : "● DB down"}
      </span>
    </div>
  );
}
