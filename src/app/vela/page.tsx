"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type SessionUser = {
  sub: string;
  name: string;
  email: string;
  role: "admin" | "analista" | "operador";
};

type Profile = {
  name: string;
  age: number | null;
  trajectory: string;
  contact: string;
  position: string;
  bio: string;
  role: "admin" | "analista" | "operador";
  profileReady: boolean;
};

type HomeSummary = {
  metrics: {
    totalEvaluations: number;
    evaluationsLast7Days: number;
    averageIev: number;
    quickActionsByMe: number;
  };
  recentEvaluations: Array<{
    id: string;
    classification: string;
    iev: number;
    createdAt: string;
  }>;
  recentQuickActions: Array<{
    id: string;
    module: string;
    actionKey: string;
    message: string;
    createdAt: string;
  }>;
};

type CoworkingMessage = {
  id: string;
  content: string;
  authorName: string;
  authorRole: "admin" | "analista" | "operador";
  createdAt: string;
};

type HealthSnapshot = {
  status: "ok" | "degraded";
  checkedAt: string;
  app: {
    status: "up";
    uptimeSeconds: number;
    env: string;
  };
  database: {
    status: "up" | "down";
    latencyMs?: number;
  };
};

const emptyProfile: Profile = {
  name: "",
  age: null,
  trajectory: "",
  contact: "",
  position: "",
  bio: "",
  role: "operador",
  profileReady: false,
};

export default function VelaHomePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState(false);
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [healthLatencyHistory, setHealthLatencyHistory] = useState<number[]>([]);
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const [coworkingMessages, setCoworkingMessages] = useState<CoworkingMessage[]>([]);
  const [coworkingInput, setCoworkingInput] = useState("");
  const [coworkingPosting, setCoworkingPosting] = useState(false);

  const menuItems = [
    { label: "Mapa de módulos", href: "/access", accent: true },
    { label: "VELASEED", href: "/velaseed" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "LUMS", href: "/access/lums" },
    { label: "Inteligencia & Insight", href: "/access/insights" },
    { label: "Builder Lab", href: "/access/builder-lab" },
    { label: "Capital y Operaciones", href: "/access/capital-ops" },
  ];

  const refreshHealth = useCallback(async () => {
    setHealthRefreshing(true);
    try {
      const healthResponse = await fetch("/api/health", { cache: "no-store" });
      if (healthResponse.ok) {
        const healthPayload: HealthSnapshot = await healthResponse.json();
        setHealth(healthPayload);
        setHealthLatencyHistory((prev) => [...prev, healthPayload.database.latencyMs ?? 0].slice(-20));
      } else {
        const degradedPayload = (await healthResponse.json().catch(() => null)) as HealthSnapshot | null;
        if (degradedPayload) {
          setHealth(degradedPayload);
          setHealthLatencyHistory((prev) => [...prev, degradedPayload.database.latencyMs ?? 0].slice(-20));
        }
      }
    } catch {
      setHealthLatencyHistory((prev) => [...prev, 0].slice(-20));
      setHealth({
        status: "degraded",
        checkedAt: new Date().toISOString(),
        app: {
          status: "up",
          uptimeSeconds: 0,
          env: "unknown",
        },
        database: {
          status: "down",
          latencyMs: 0,
        },
      });
    } finally {
      setHealthRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });

        if (!meResponse.ok) {
          setError("Sesión expirada. Vuelve a iniciar sesión.");
          setLoading(false);
          return;
        }

        const mePayload: { user: SessionUser } = await meResponse.json();
        setUser(mePayload.user);

        const profileResponse = await fetch("/api/profile", { cache: "no-store" });

        if (!profileResponse.ok) {
          throw new Error("No se pudo cargar perfil");
        }

        const profilePayload: { profile: Profile } = await profileResponse.json();
        setProfile(profilePayload.profile);

        const summaryResponse = await fetch("/api/home/summary", { cache: "no-store" });
        if (summaryResponse.ok) {
          const summaryPayload: HomeSummary = await summaryResponse.json();
          setSummary(summaryPayload);
        }

        await refreshHealth();

        const coworkingResponse = await fetch("/api/coworking/messages", { cache: "no-store" });
        if (coworkingResponse.ok) {
          const coworkingPayload: { messages: CoworkingMessage[] } = await coworkingResponse.json();
          setCoworkingMessages(coworkingPayload.messages);
        }
      } catch {
        setError("No se pudo cargar el perfil. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [refreshHealth]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshHealth();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshHealth]);

  const completion = useMemo(() => {
    const fields = [
      profile.name,
      profile.age,
      profile.trajectory,
      profile.contact,
      profile.position,
      profile.bio,
    ];

    const completed = fields.filter((field) => {
      if (typeof field === "number") return true;
      return Boolean(field && String(field).trim().length > 0);
    }).length;

    return Math.round((completed / fields.length) * 100);
  }, [profile]);

  const checklist = useMemo(
    () => [
      { label: "Nombre", done: profile.name.trim().length > 0 },
      { label: "Edad", done: profile.age !== null },
      { label: "Trayectoria", done: profile.trajectory.trim().length > 0 },
      { label: "Contacto", done: profile.contact.trim().length > 0 },
      { label: "Cargo", done: profile.position.trim().length > 0 },
      { label: "Bio", done: profile.bio.trim().length > 0 },
    ],
    [profile],
  );

  const roleShortcuts = useMemo(() => {
    const base = [
      { label: "Abrir VELASEED", href: "/velaseed" },
      { label: "Centro de navegación", href: "/access" },
      { label: "React Lab Avanzado", href: "/react-lab" },
    ];

    if (user?.role === "admin") {
      return [
        ...base,
        { label: "Dashboard institucional", href: "/dashboard" },
        { label: "Gestionar usuarios", href: "/admin/users" },
      ];
    }

    if (user?.role === "analista") {
      return [...base, { label: "Dashboard institucional", href: "/dashboard" }];
    }

    return base;
  }, [user?.role]);

  const latencyStats = useMemo(() => {
    if (healthLatencyHistory.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }

    const min = Math.min(...healthLatencyHistory);
    const max = Math.max(...healthLatencyHistory);
    const avg = Math.round(
      healthLatencyHistory.reduce((acc, value) => acc + value, 0) /
        healthLatencyHistory.length,
    );

    return { min, avg, max };
  }, [healthLatencyHistory]);

  const sparklinePoints = useMemo(() => {
    if (healthLatencyHistory.length <= 1) {
      return "";
    }

    const max = Math.max(...healthLatencyHistory, 1);
    return healthLatencyHistory
      .map((value, index) => {
        const x = (index / (healthLatencyHistory.length - 1)) * 100;
        const y = 40 - (value / max) * 40;
        return `${x},${y}`;
      })
      .join(" ");
  }, [healthLatencyHistory]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: profile.name,
      age: profile.age,
      trajectory: profile.trajectory,
      contact: profile.contact,
      position: profile.position,
      bio: profile.bio,
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar perfil");
      }

      const data: { profile: Profile } = await response.json();
      setProfile(data.profile);
      setMessage("Perfil guardado correctamente.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar perfil";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const publishCoworkingMessage = async (event: FormEvent) => {
    event.preventDefault();

    if (!coworkingInput.trim()) {
      return;
    }

    setCoworkingPosting(true);
    setError(null);

    try {
      const response = await fetch("/api/coworking/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: coworkingInput }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: CoworkingMessage;
      };

      if (!response.ok || !body.message) {
        throw new Error(body.error || "No se pudo publicar el mensaje");
      }

      setCoworkingMessages((prev) => [body.message!, ...prev].slice(0, 20));
      setCoworkingInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al publicar mensaje";
      setError(msg);
    } finally {
      setCoworkingPosting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const openDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (!drawerPinned) {
      setDrawerOpen(false);
    }
  };

  const toggleDrawer = () => {
    if (drawerPinned) {
      setDrawerPinned(false);
      setDrawerOpen(false);
      return;
    }

    setDrawerPinned(true);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6 py-16 text-center text-foreground">
        Cargando VELA...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">
            VELA · Página principal
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Bienvenido a VELA
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {user ? `${user.name} (${user.email}) · rol ${user.role}` : ""}
          </p>
          <div className="flex gap-3">
            <p className="text-sm font-medium text-zinc-500">
              {profile.profileReady
                ? "Perfil completo. Usa el botón lateral para abrir Vela Portals y secciones."
                : "Completa y guarda tu perfil para desbloquear Vela Portals."}
            </p>
            <button type="button" onClick={logout} className="text-sm font-medium underline">
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Evaluaciones totales</p>
            <p className="mt-2 text-2xl font-bold">{summary?.metrics.totalEvaluations ?? 0}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Últimos 7 días</p>
            <p className="mt-2 text-2xl font-bold">{summary?.metrics.evaluationsLast7Days ?? 0}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500">IEV promedio</p>
            <p className="mt-2 text-2xl font-bold">{summary?.metrics.averageIev ?? 0}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Acciones rápidas (tú)</p>
            <p className="mt-2 text-2xl font-bold">{summary?.metrics.quickActionsByMe ?? 0}</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Estado operativo</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Monitoreo en tiempo real de aplicación y base de datos.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <p className="text-zinc-500">Plataforma</p>
              <p className="font-semibold">{health?.app.status === "up" ? "Operativa" : "Sin estado"}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <p className="text-zinc-500">Base de datos</p>
              <p className={`font-semibold ${health?.database.status === "up" ? "text-emerald-600" : "text-red-500"}`}>
                {health?.database.status === "up" ? "Conectada" : "Caída"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <p className="text-zinc-500">Última verificación</p>
              <p className="font-semibold">
                {health?.checkedAt ? new Date(health.checkedAt).toLocaleString("es-ES") : "Pendiente"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <p className="text-zinc-500">Latencia DB</p>
              <p className="font-semibold">{health?.database.latencyMs ?? 0} ms</p>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={refreshHealth}
              disabled={healthRefreshing}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold dark:border-zinc-700 disabled:opacity-70"
            >
              {healthRefreshing ? "Reintentando..." : "Reintentar ahora"}
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Historial latencia (20 checks)</p>
              <p className="text-xs text-zinc-500">
                min {latencyStats.min}ms · avg {latencyStats.avg}ms · max {latencyStats.max}ms
              </p>
            </div>
            <div className="mt-2 h-12 w-full">
              {healthLatencyHistory.length > 1 ? (
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="text-zinc-700 dark:text-zinc-300"
                  />
                </svg>
              ) : (
                <p className="text-xs text-zinc-500">Aún no hay suficientes muestras para la gráfica.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Actividad reciente · Evaluaciones</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(summary?.recentEvaluations ?? []).map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <p className="font-medium">{item.classification} · IEV {item.iev}</p>
                  <p className="text-zinc-500">{new Date(item.createdAt).toLocaleString("es-ES")}</p>
                </li>
              ))}
              {(summary?.recentEvaluations ?? []).length === 0 ? (
                <li className="text-zinc-500">Sin evaluaciones registradas.</li>
              ) : null}
            </ul>
          </article>

          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Actividad reciente · Acciones rápidas</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(summary?.recentQuickActions ?? []).map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <p className="font-medium">{item.module} · {item.actionKey}</p>
                  <p className="text-zinc-500">{item.message}</p>
                  <p className="text-zinc-500">{new Date(item.createdAt).toLocaleString("es-ES")}</p>
                </li>
              ))}
              {(summary?.recentQuickActions ?? []).length === 0 ? (
                <li className="text-zinc-500">Aún no tienes acciones rápidas registradas.</li>
              ) : null}
            </ul>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Atajos por rol</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Accesos directos para continuar tu flujo operativo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {roleShortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
              >
                {shortcut.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Mini resumen de perfil</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Vista estratégica rápida de tu perfil dentro de VELA.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-zinc-500">Nombre:</span> {profile.name || "-"}
              </li>
              <li className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-zinc-500">Rol:</span> {profile.role}
              </li>
              <li className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-zinc-500">Cargo:</span> {profile.position || "-"}
              </li>
              <li className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-zinc-500">Contacto:</span> {profile.contact || "-"}
              </li>
              <li className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-zinc-500">Completitud:</span> {completion}%
              </li>
            </ul>
          </article>

          <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Coworking · Muro rápido</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Comparte bloqueos, avances y solicitudes con el equipo.
            </p>

            <form onSubmit={publishCoworkingMessage} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Escribe una actualización breve..."
                value={coworkingInput}
                onChange={(event) => setCoworkingInput(event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                maxLength={280}
              />
              <button
                type="submit"
                disabled={coworkingPosting}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-70"
              >
                {coworkingPosting ? "Publicando..." : "Publicar"}
              </button>
            </form>

            <ul className="mt-3 space-y-2 text-sm">
              {coworkingMessages.map((item) => (
                <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <p>{item.content}</p>
                  <p className="text-zinc-500">
                    {item.authorName} · {item.authorRole} · {new Date(item.createdAt).toLocaleString("es-ES")}
                  </p>
                </li>
              ))}
              {coworkingMessages.length === 0 ? (
                <li className="text-zinc-500">Todavía no hay publicaciones de coworking.</li>
              ) : null}
            </ul>
          </article>
        </section>

        {profile.profileReady ? (
          <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Perfil completo ✅</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Tu perfil biográfico está al 100%. Ya puedes navegar por todas las
              secciones habilitadas de VELA.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Perfil biográfico</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Completa tu perfil antes de interactuar en profundidad con la plataforma.
              </p>
              <p className="mt-3 text-sm font-semibold">Progreso: {completion}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <span aria-hidden="true">{item.done ? "✅" : "⬜"}</span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <form
              onSubmit={saveProfile}
              className="grid gap-4 rounded-xl border border-zinc-200 p-6 md:grid-cols-2 dark:border-zinc-800"
            >
          <label className="text-sm">
            Nombre
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm">
            Edad
            <input
              type="number"
              min={13}
              max={120}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={profile.age ?? ""}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  age: event.target.value ? Number(event.target.value) : null,
                }))
              }
            />
          </label>

          <label className="text-sm md:col-span-2">
            Trayectoria
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              rows={3}
              value={profile.trajectory}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, trajectory: event.target.value }))
              }
            />
          </label>

          <label className="text-sm">
            Contacto
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={profile.contact}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, contact: event.target.value }))
              }
            />
          </label>

          <label className="text-sm">
            Cargo
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={profile.position}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, position: event.target.value }))
              }
            />
          </label>

          <label className="text-sm">
            Rol del sistema
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              value={profile.role}
              disabled
            />
          </label>

          <label className="text-sm md:col-span-2">
            Bio
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
              rows={4}
              value={profile.bio}
              onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
            />
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-emerald-600">{message}</p>}
          </div>
            </form>
          </>
        )}

        <>
            <button
              type="button"
              onClick={toggleDrawer}
              onMouseEnter={openDrawer}
              className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-zinc-300 bg-foreground px-3 py-3 text-xs font-semibold uppercase tracking-wide text-background shadow-lg dark:border-zinc-700"
              aria-expanded={drawerOpen}
              aria-controls="vela-side-drawer"
            >
              {drawerOpen ? "Cerrar" : "Vela"}
            </button>

            <aside
              id="vela-side-drawer"
              onMouseEnter={openDrawer}
              onMouseLeave={closeDrawer}
              className={`fixed right-0 top-1/2 z-30 w-80 -translate-y-1/2 rounded-l-2xl border border-zinc-200 bg-background/95 p-5 shadow-2xl backdrop-blur transition-transform duration-200 dark:border-zinc-800 ${
                drawerOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">
                VELA NAV
              </p>
              <h3 className="mt-2 text-lg font-semibold">Navegación retráctil</h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Pasa el mouse para desplegar. Haz clic en el botón para fijar o cerrar.
              </p>

              <nav className="mt-4 space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setDrawerPinned(false);
                      setDrawerOpen(false);
                    }}
                    className={`block rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      item.accent
                        ? "border-foreground bg-foreground text-background"
                        : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
        </>
      </main>
    </div>
  );
}
