"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type WaitlistStatus = "pending" | "contacted" | "signup" | "opted_out";

type WaitlistSignupItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  ventureName: string;
  sector: string | null;
  stage: string | null;
  monthlyRevenue: number | null;
  mainNeed: string | null;
  interestedInBeta: boolean;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: WaitlistStatus[] = ["pending", "contacted", "signup", "opted_out"];

function getStatusTone(status: WaitlistStatus) {
  if (status === "signup") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (status === "contacted") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300";
  }

  if (status === "opted_out") {
    return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
}

export default function AdminWaitlistPage() {
  const [items, setItems] = useState<WaitlistSignupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<WaitlistStatus>("pending");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("validation");
  const [mainNeed, setMainNeed] = useState("");

  const loadWaitlist = useCallback(async () => {
    if (!isUnlocked) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        cache: "no-store",
        headers: {
          "x-waitlist-access-key": accessKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Sesión expirada. Inicia sesión nuevamente.");
          return;
        }

        if (response.status === 403) {
          setError("Clave de acceso inválida o sin permisos para ver la waitlist.");
          return;
        }

        throw new Error("No se pudo cargar la waitlist");
      }

      const data: { signups: WaitlistSignupItem[] } = await response.json();
      setItems(data.signups);

      if (data.signups.length > 0 && !selectedId) {
        setSelectedId(data.signups[0].id);
      }
    } catch {
      setError("No se pudo cargar la waitlist.");
    } finally {
      setLoading(false);
    }
  }, [accessKey, isUnlocked, selectedId]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  const unlockWaitlist = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsUnlocked(true);
  };

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    setStatus(selectedItem.status);
    setPhone(selectedItem.phone ?? "");
    setCity(selectedItem.city ?? "");
    setSector(selectedItem.sector ?? "");
    setStage(selectedItem.stage ?? "validation");
    setMainNeed(selectedItem.mainNeed ?? "");
  }, [selectedItem]);

  const updateSignup = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-waitlist-access-key": accessKey,
        },
        body: JSON.stringify({
          id: selectedItem.id,
          status,
          phone,
          city,
          sector,
          stage,
          mainNeed,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el registro");
      }

      await loadWaitlist();
      setMessage("Registro actualizado.");
    } catch {
      setError("No se pudo actualizar el registro.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">
            Admin Console · Waitlist
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Gestión de lista de espera
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Revisa leads entrantes, cambia su estado y completa seguimiento operativo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/users" className="text-sm font-medium underline">
              Usuarios
            </Link>
            <Link href="/admin/content" className="text-sm font-medium underline">
              Contenido
            </Link>
            <Link href="/dashboard" className="text-sm font-medium underline">
              Dashboard
            </Link>
            <button type="button" onClick={logout} className="text-sm font-medium underline">
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Clave de acceso de gestión</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Esta vista admin requiere rol administrador, clave única y puede limitarse además por email o IP autorizados.
              </p>
            </div>
            {isUnlocked && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                Acceso habilitado
              </span>
            )}
          </div>
          <form onSubmit={unlockWaitlist} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex-1 text-sm">
              Clave única
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                placeholder="Ingresa la clave de gestión"
                required
              />
            </label>
            <button type="submit" className="vela-accent-button px-4 py-2 text-sm">
              Desbloquear waitlist
            </button>
          </form>
        </section>

        {error && (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </section>
        )}

        {message && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {message}
          </section>
        )}

        {isUnlocked && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Registros</h2>
              <span className="text-sm text-zinc-500">
                {loading ? "Cargando..." : `${items.length} leads`}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${selectedId === item.id ? "border-[var(--accent)] bg-[rgba(232,92,45,0.06)]" : "border-zinc-200 dark:border-zinc-800"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {item.email} · {item.ventureName}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusTone(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {new Date(item.createdAt).toLocaleString()} · {item.city ?? "Sin ciudad"}
                  </p>
                </button>
              ))}
              {!loading && items.length === 0 && (
                <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                  No hay registros en la waitlist.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Detalle y seguimiento</h2>
            {!selectedItem ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                Selecciona un registro para gestionarlo.
              </p>
            ) : (
              <form onSubmit={updateSignup} className="mt-4 space-y-4">
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <p className="font-semibold">{selectedItem.name}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {selectedItem.email}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {selectedItem.ventureName} · ingresos {selectedItem.monthlyRevenue ?? 0}
                  </p>
                </div>

                <label className="block text-sm">
                  Estado
                  <select
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as WaitlistStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  Teléfono
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  Ciudad
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  Sector
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                    value={sector}
                    onChange={(event) => setSector(event.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  Etapa
                  <select
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                    value={stage}
                    onChange={(event) => setStage(event.target.value)}
                  >
                    <option value="idea">Idea</option>
                    <option value="validation">Validación</option>
                    <option value="traction">Tracción</option>
                    <option value="growth">Crecimiento</option>
                  </select>
                </label>

                <label className="block text-sm">
                  Necesidad principal
                  <textarea
                    rows={5}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                    value={mainNeed}
                    onChange={(event) => setMainNeed(event.target.value)}
                  />
                </label>

                <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                  Beta: {selectedItem.interestedInBeta ? "sí" : "no"} · actualizado {new Date(selectedItem.updatedAt).toLocaleString()}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="vela-accent-button px-4 py-2 text-sm"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            )}
          </div>
        </section>
        )}
      </main>
    </div>
  );
}