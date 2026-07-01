"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  module: "human" | "space" | "adventure";
  className?: string;
  label?: string;
};

type SessionPayload = {
  user: {
    role: "admin" | "analista" | "operador";
  };
};

export default function AdminCreateContentLink({ module, className, label = "Crear contenido" }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          setReady(true);
          return;
        }

        const payload: SessionPayload = await response.json();
        setIsAdmin(payload.user.role === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  if (!ready || !isAdmin) {
    return null;
  }

  return (
    <Link href={`/admin/content?module=${module}`} className={className ?? "vela-accent-button px-4 py-2 text-sm"}>
      {label}
    </Link>
  );
}
