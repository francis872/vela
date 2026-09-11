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

type MfaSetup = {
  otpauthUrl: string;
  secret: string;
  recoveryCodes: string[];
};

type SkillItem = { id: string; proficiency: string | null; skill: { id: string; name: string } };

type ProfessionalProfile = {
  headline: string;
  summary: string;
  location: string;
  availability: string;
  visibility: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);

  // Professional profile
  const [pro, setPro] = useState<ProfessionalProfile>({
    headline: "", summary: "", location: "", availability: "available", visibility: "connections",
  });
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [proBusy, setProBusy] = useState(false);
  const [proMessage, setProMessage] = useState<string | null>(null);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "V";

  const roleLabels: Record<string, { label: string; classes: string }> = {
    admin: { label: "Administrador", classes: "border-rose-500/30 bg-rose-500/10 text-rose-400" },
    analista: { label: "Analista", classes: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
    operador: { label: "Operador", classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  };

  const parseDevice = (userAgent: string | null) => {
    if (!userAgent) return "Dispositivo desconocido";
    const browser = userAgent.includes("Edg") ? "Edge"
      : userAgent.includes("Chrome") ? "Chrome"
      : userAgent.includes("Firefox") ? "Firefox"
      : userAgent.includes("Safari") ? "Safari"
      : "Navegador";
    const os = userAgent.includes("Windows") ? "Windows"
      : userAgent.includes("Mac OS") ? "macOS"
      : userAgent.includes("Linux") ? "Linux"
      : userAgent.includes("Android") ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iPad") ? "iOS"
      : "";
    return [browser, os].filter(Boolean).join(" · ");
  };

  useEffect(() => {
    let alive = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (meResponse) => {
        if (!meResponse.ok) {
          router.replace("/login?next=/profile");
          return;
        }

        const meData = await meResponse.json();
        const [sessionsResponse, logsResponse, mfaResponse, proResponse] = await Promise.all([
          fetch("/api/auth/sessions", { cache: "no-store" }),
          fetch("/api/auth/access-log", { cache: "no-store" }),
          fetch("/api/auth/mfa", { cache: "no-store" }),
          fetch("/api/profile/professional", { cache: "no-store" }),
        ]);

        const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : { sessions: [] };
        const logsData = logsResponse.ok ? await logsResponse.json() : { logs: [] };
        const mfaData = mfaResponse.ok ? await mfaResponse.json() : { enabled: false };
        const proData = proResponse.ok ? await proResponse.json() : { profile: null, skills: [] };

        if (!alive) return;
        setUser(meData.user);
        setSessions(sessionsData.sessions || []);
        setLogs(logsData.logs || []);
        setMfaEnabled(Boolean(mfaData.enabled));
        if (proData.profile) {
          setPro({
            headline: proData.profile.headline ?? "",
            summary: proData.profile.summary ?? "",
            location: proData.profile.location ?? "",
            availability: proData.profile.availability ?? "available",
            visibility: proData.profile.visibility ?? "connections",
          });
        }
        setSkills(proData.skills || []);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError("No se pudo cargar tu perfil de seguridad.");
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [router]);

  const successfulLogs = useMemo(() => logs.filter((item) => item.success).length, [logs]);

  const saveProfile = async () => {
    setProBusy(true);
    setProMessage(null);
    try {
      const res = await fetch("/api/profile/professional", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pro),
      });
      if (!res.ok) throw new Error("No se pudo guardar el perfil");
      setProMessage("Perfil guardado.");
    } catch (err) {
      setProMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setProBusy(false);
    }
  };

  const addSkill = async () => {
    const name = newSkill.trim();
    if (!name) return;
    setProBusy(true);
    try {
      const res = await fetch("/api/profile/professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_skill", name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo añadir");
      setSkills((prev) => [...prev, data.skill]);
      setNewSkill("");
    } catch (err) {
      setProMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setProBusy(false);
    }
  };

  const removeSkill = async (skillId: string) => {
    setProBusy(true);
    try {
      await fetch("/api/profile/professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_skill", skillId }),
      });
      setSkills((prev) => prev.filter((s) => s.skill.id !== skillId));
    } finally {
      setProBusy(false);
    }
  };

  const startMfa = async () => {
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) throw new Error("No se pudo iniciar la configuración");
      setMfaSetup(await res.json());
    } catch (err) {
      setMfaMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmMfa = async () => {
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code: mfaCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Código incorrecto");
      setMfaEnabled(true);
      setMfaSetup(null);
      setMfaCode("");
      setMfaMessage("MFA activado. Guarda tus códigos de recuperación.");
    } catch (err) {
      setMfaMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      if (!res.ok) throw new Error("No se pudo desactivar");
      setMfaEnabled(false);
      setMfaSetup(null);
      setMfaMessage("MFA desactivado.");
    } catch (err) {
      setMfaMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setMfaBusy(false);
    }
  };

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
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[var(--accent)]" />
          <p className="text-sm text-zinc-400">Cargando tu perfil…</p>
        </div>
      </div>
    );
  }

  const roleInfo = user ? (roleLabels[user.role] ?? roleLabels.operador) : roleLabels.operador;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        {/* ── Hero: identidad ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="h-20 bg-gradient-to-r from-[var(--accent)]/25 via-zinc-800 to-transparent" />
          <div className="px-6 pb-6">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-zinc-900 bg-[var(--accent)] text-2xl font-extrabold text-white shadow-lg">
                  {user ? getInitials(user.name) : "V"}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-bold tracking-tight">{user?.name ?? "Usuario"}</h1>
                  <p className="text-sm text-zinc-400">{user?.email}</p>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${roleInfo.classes}`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Sesiones activas</p>
                <p className="mt-1 text-2xl font-bold">{sessions.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Accesos exitosos</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">{successfulLogs}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Intentos fallidos</p>
                <p className="mt-1 text-2xl font-bold text-rose-400">{logs.length - successfulLogs}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="/forgot-password"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                Recuperar contraseña
              </a>
              <button
                type="button"
                onClick={handleLogoutAll}
                disabled={logoutAllLoading}
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
              >
                {logoutAllLoading ? "Cerrando…" : "Cerrar todas las sesiones"}
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        </section>

        {/* ── Sesiones activas ── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Sesiones activas</h2>
            <span className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
              {sessions.length} {sessions.length === 1 ? "dispositivo" : "dispositivos"}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {sessions.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
                No hay sesiones activas registradas.
              </p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm transition ${
                  session.isCurrent
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-zinc-800 bg-zinc-950/60"
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    session.isCurrent ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong>{session.isCurrent ? "Sesión actual" : "Sesión activa"}</strong>
                      {session.isCurrent && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Este equipo
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(session.lastSeenAt).toLocaleString("es-ES")}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-300">{parseDevice(session.userAgent)}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">IP: {session.ip || "n/d"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Perfil profesional ── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-semibold">Perfil profesional</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cómo te ve la red de VELA. Controla la visibilidad de tu información.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Titular</label>
              <input
                value={pro.headline}
                onChange={(e) => setPro({ ...pro, headline: e.target.value })}
                placeholder="Fundadora · HealthTech · B2B"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Resumen</label>
              <textarea
                value={pro.summary}
                onChange={(e) => setPro({ ...pro, summary: e.target.value })}
                rows={3}
                placeholder="Qué construyes, qué buscas, cómo puedes ayudar…"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Ubicación</label>
              <input
                value={pro.location}
                onChange={(e) => setPro({ ...pro, location: e.target.value })}
                placeholder="Ciudad, País"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Disponibilidad</label>
              <select
                value={pro.availability}
                onChange={(e) => setPro({ ...pro, availability: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 outline-none focus:border-[var(--accent)]"
              >
                <option value="available">Disponible</option>
                <option value="open_to_collaborate">Abierto a colaborar</option>
                <option value="mentoring">Mentoría</option>
                <option value="busy">Ocupado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Visibilidad</label>
              <select
                value={pro.visibility}
                onChange={(e) => setPro({ ...pro, visibility: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 outline-none focus:border-[var(--accent)]"
              >
                <option value="public">Público</option>
                <option value="connections">Solo conexiones</option>
                <option value="private">Privado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Skills</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="Ej. pricing B2B"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  disabled={proBusy || !newSkill.trim()}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  Añadir
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.length === 0 && <span className="text-xs text-zinc-500">Sin skills todavía.</span>}
                {skills.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs">
                    {s.skill.name}
                    <button
                      type="button"
                      onClick={() => removeSkill(s.skill.id)}
                      className="text-zinc-500 hover:text-rose-400"
                      aria-label={`Eliminar ${s.skill.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={proBusy}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {proBusy ? "Guardando…" : "Guardar perfil"}
            </button>
            {proMessage && <span className="text-sm text-zinc-300">{proMessage}</span>}
          </div>
        </section>

        {/* ── Seguridad: MFA ── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Autenticación de dos factores</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              mfaEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 text-zinc-400"
            }`}>
              {mfaEnabled ? "Activada" : "Desactivada"}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Añade una capa extra de seguridad con una aplicación de autenticación (TOTP).
          </p>

          {!mfaEnabled && !mfaSetup && (
            <button
              type="button"
              onClick={startMfa}
              disabled={mfaBusy}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {mfaBusy ? "Preparando…" : "Configurar MFA"}
            </button>
          )}

          {mfaSetup && (
            <div className="mt-4 grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">1 · Añade esta clave a tu autenticador</p>
                <p className="mt-1 break-all rounded bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200">{mfaSetup.secret}</p>
                <p className="mt-1 break-all text-[11px] text-zinc-500">{mfaSetup.otpauthUrl}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">2 · Guarda tus códigos de recuperación (una sola vez)</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {mfaSetup.recoveryCodes.map((c) => (
                    <code key={c} className="rounded bg-zinc-900 px-2 py-1 text-center font-mono text-xs text-zinc-300">{c}</code>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">3 · Introduce el código de 6 dígitos</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-40 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-center tracking-[0.3em] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={confirmMfa}
                    disabled={mfaBusy || mfaCode.trim().length < 6}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {mfaBusy ? "Verificando…" : "Activar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mfaEnabled && !mfaSetup && (
            <button
              type="button"
              onClick={disableMfa}
              disabled={mfaBusy}
              className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
            >
              {mfaBusy ? "Procesando…" : "Desactivar MFA"}
            </button>
          )}

          {mfaMessage && <p className="mt-3 text-sm text-zinc-300">{mfaMessage}</p>}
        </section>

        {/* ── Historial de accesos ── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Historial de accesos</h2>
            <p className="text-xs text-zinc-500">
              {successfulLogs} exitosos · {logs.length - successfulLogs} fallidos
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            {logs.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-400">
                Aún no hay eventos de acceso.
              </p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    log.success ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {log.success ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className={log.success ? "text-emerald-300" : "text-rose-300"}>
                      {log.success ? "Acceso correcto" : "Acceso fallido"}
                    </strong>
                    <span className="text-xs text-zinc-500">
                      {new Date(log.createdAt).toLocaleString("es-ES")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    IP: {log.ip || "n/d"}
                    {log.reason ? ` · Motivo: ${log.reason}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
