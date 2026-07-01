"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

type SessionItem = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
};

type AccessLogItem = {
  id: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });

        if (!meResponse.ok) {
          router.replace("/login?next=/profile");
          return;
        }

        const meData = await meResponse.json();
        const [sessionsResponse, logsResponse] = await Promise.all([
          fetch("/api/auth/sessions", { cache: "no-store" }),
          fetch("/api/auth/access-log", { cache: "no-store" }),
        ]);

        const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : { sessions: [] };
        const logsData = logsResponse.ok ? await logsResponse.json() : { logs: [] };

        if (!alive) {
          return;
        }

        setUser(meData.user);
        setSessions(sessionsData.sessions || []);
        setLogs(logsData.logs || []);
      } catch {
        if (alive) {
          setError("No se pudo cargar tu perfil de seguridad.");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [router]);

  const successfulLogs = useMemo(() => logs.filter((item) => item.success).length, [logs]);

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo cerrar sesiones");
      }
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLogoutAllLoading(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-foreground">Cargando perfil...</div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h1 className="text-2xl font-bold">Perfil y seguridad</h1>
          <p className="mt-1 text-sm text-zinc-400">Controla sesiones activas y revisa accesos recientes.</p>

          {user && (
            <div className="mt-4 grid gap-1 text-sm">
              <span>Nombre: {user.name}</span>
              <span>Email: {user.email}</span>
              <span>Rol: {user.role}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href="/forgot-password" className="text-sm font-semibold text-foreground hover:underline">
              Recuperar contraseña
            </a>
            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={logoutAllLoading}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm disabled:opacity-60"
            >
              {logoutAllLoading ? "Cerrando..." : "Cerrar todas las sesiones"}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="text-lg font-semibold">Sesiones activas ({sessions.length})</h2>
          <div className="mt-3 grid gap-2">
            {sessions.length === 0 && <p className="text-sm text-zinc-400">No hay sesiones activas registradas.</p>}
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{session.isCurrent ? "Sesion actual" : "Sesion activa"}</strong>
                  <span>{new Date(session.lastSeenAt).toLocaleString("es-ES")}</span>
                </div>
                <p className="mt-1">IP: {session.ip || "n/d"}</p>
                <p className="mt-1 truncate text-zinc-400">{session.userAgent || "n/d"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="text-lg font-semibold">Historial de accesos</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Intentos exitosos: {successfulLogs} / {logs.length}
          </p>
          <div className="mt-3 grid gap-2">
            {logs.length === 0 && <p className="text-sm text-zinc-400">Aun no hay eventos de acceso.</p>}
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className={log.success ? "text-emerald-400" : "text-red-400"}>
                    {log.success ? "Acceso correcto" : "Acceso fallido"}
                  </strong>
                  <span>{new Date(log.createdAt).toLocaleString("es-ES")}</span>
                </div>
                <p className="mt-1">IP: {log.ip || "n/d"}</p>
                {log.reason && <p className="mt-1">Motivo: {log.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
