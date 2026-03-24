"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Role = "admin" | "analista" | "operador";

type UserItem = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type QuickActionAuditItem = {
  id: string;
  actionKey: string;
  module: string;
  context: string | null;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
};

const emptyCreateForm = {
  email: "",
  name: "",
  role: "operador" as Role,
  password: "",
  active: true,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quickActions, setQuickActions] = useState<QuickActionAuditItem[]>([]);
  const [quickActionsLoading, setQuickActionsLoading] = useState(true);
  const [quickActionsError, setQuickActionsError] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetKeyword, setResetKeyword] = useState("");

  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("operador");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Sesión expirada. Inicia sesión nuevamente.");
          setLoading(false);
          return;
        }

        if (response.status === 403) {
          setError("Solo admins pueden gestionar usuarios.");
          setLoading(false);
          return;
        }

        throw new Error("No se pudo cargar usuarios");
      }

      const data: { users: UserItem[] } = await response.json();
      setUsers(data.users);

      if (data.users.length > 0 && !selectedUserId) {
        const first = data.users[0];
        setSelectedUserId(first.id);
        setEditName(first.name);
        setEditRole(first.role);
        setEditActive(first.active);
      }
    } catch {
      setError("No se pudieron cargar usuarios. Verifica migraciones y conexión DB.");
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  const loadQuickActions = useCallback(async () => {
    setQuickActionsLoading(true);
    setQuickActionsError(null);

    try {
      const response = await fetch("/api/quick-actions?limit=30", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("No se pudo cargar auditoría");
      }

      const data: { executions: QuickActionAuditItem[] } = await response.json();
      setQuickActions(data.executions);
    } catch {
      setQuickActionsError("No se pudo cargar el historial de acciones rápidas.");
    } finally {
      setQuickActionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadQuickActions();
  }, [loadQuickActions]);

  useEffect(() => {
    const selected = users.find((item) => item.id === selectedUserId);
    if (!selected) {
      return;
    }

    setEditName(selected.name);
    setEditRole(selected.role);
    setEditActive(selected.active);
    setEditPassword("");
  }, [selectedUserId, users]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });

    if (!response.ok) {
      setError("No se pudo crear usuario. Verifica email único y contraseña >= 6.");
      return;
    }

    setCreateForm(emptyCreateForm);
    await loadUsers();
    await loadQuickActions();
    setMessage("Usuario creado.");
  };

  const updateUser = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedUserId) {
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedUserId,
        name: editName,
        role: editRole,
        active: editActive,
        password: editPassword || undefined,
      }),
    });

    if (!response.ok) {
      setError("No se pudo actualizar usuario.");
      return;
    }

    setEditPassword("");
    await loadUsers();
    await loadQuickActions();
    setMessage("Usuario actualizado.");
  };

  const runSeed = async (force: boolean) => {
    setError(null);
    setMessage(null);
    setSeeding(true);

    const response = await fetch("/api/admin/seed-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });

    if (!response.ok) {
      setError("No se pudo ejecutar seed de usuarios.");
      setSeeding(false);
      return;
    }

    setMessage(
      force
        ? "Usuarios por defecto resembrados (reset)."
        : "Usuarios por defecto verificados (ensure).",
    );
    await loadUsers();
    await loadQuickActions();
    setSeeding(false);
  };

  const confirmResetSeed = async () => {
    if (resetKeyword.trim().toUpperCase() !== "RESET") {
      setError("Escribe RESET para confirmar la acción.");
      return;
    }

    await runSeed(true);
    setResetKeyword("");
    setConfirmResetOpen(false);
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
            Admin Console · Gestión de Usuarios
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Usuarios y roles de VELA
          </h1>
          <div className="flex gap-3">
            <Link href="/" className="text-sm font-medium underline">
              Volver al inicio
            </Link>
            <Link href="/dashboard" className="text-sm font-medium underline">
              Ir al dashboard
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium underline"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}

        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Seed manual</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Ejecuta bootstrap o reset de usuarios por defecto desde el panel.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runSeed(false)}
              disabled={seeding}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
            >
              {seeding ? "Procesando..." : "Seed (ensure)"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={seeding}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Reseed (reset)
            </button>
          </div>
        </section>

        {confirmResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-background p-5 shadow-lg dark:border-zinc-800">
              <h3 className="text-lg font-semibold">Confirmar reset de usuarios</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Esta acción restablece los usuarios por defecto y puede sobrescribir
                configuraciones esperadas para pruebas.
              </p>
              <label className="mt-3 block text-sm">
                Escribe <span className="font-semibold">RESET</span> para confirmar
                <input
                  type="text"
                  value={resetKeyword}
                  onChange={(event) => setResetKeyword(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                />
              </label>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResetOpen(false);
                    setResetKeyword("");
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmResetSeed}
                  disabled={seeding || resetKeyword.trim().toUpperCase() !== "RESET"}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
                >
                  {seeding ? "Reseteando..." : "Confirmar reset"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={createUser}
            className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Crear usuario</h2>

            <label className="block text-sm">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>

            <label className="block text-sm">
              Nombre
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

            <label className="block text-sm">
              Rol
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={createForm.role}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as Role }))}
              >
                <option value="admin">admin</option>
                <option value="analista">analista</option>
                <option value="operador">operador</option>
              </select>
            </label>

            <label className="block text-sm">
              Contraseña
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createForm.active}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Usuario activo
            </label>

            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Crear
            </button>
          </form>

          <form
            onSubmit={updateUser}
            className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Editar usuario</h2>

            <label className="block text-sm">
              Usuario
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={users.length === 0}
              >
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Nombre
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              Rol
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
              >
                <option value="admin">admin</option>
                <option value="analista">analista</option>
                <option value="operador">operador</option>
              </select>
            </label>

            <label className="block text-sm">
              Nueva contraseña (opcional)
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              Usuario activo
            </label>

            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Guardar cambios
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Listado</h2>
          {loading ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Cargando usuarios...</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {users.map((item) => (
                <li key={item.id}>
                  • {item.name} · {item.email} · rol {item.role} · {item.active ? "activo" : "inactivo"}
                </li>
              ))}
              {users.length === 0 && <li>• Sin usuarios registrados.</li>}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Auditoría · Acciones rápidas</h2>
          {quickActionsError ? (
            <p className="mt-3 text-sm text-red-500">{quickActionsError}</p>
          ) : quickActionsLoading ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Cargando historial...</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 pr-4 font-medium">Usuario</th>
                    <th className="py-2 pr-4 font-medium">Módulo</th>
                    <th className="py-2 pr-4 font-medium">Acción</th>
                    <th className="py-2 pr-4 font-medium">Contexto</th>
                    <th className="py-2 font-medium">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {quickActions.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-2 pr-4">{new Date(item.createdAt).toLocaleString("es-ES")}</td>
                      <td className="py-2 pr-4">{item.user.name} ({item.user.email})</td>
                      <td className="py-2 pr-4">{item.module}</td>
                      <td className="py-2 pr-4">{item.actionKey}</td>
                      <td className="py-2 pr-4">{item.context || "-"}</td>
                      <td className="py-2">{item.message}</td>
                    </tr>
                  ))}
                  {quickActions.length === 0 && (
                    <tr>
                      <td className="py-2" colSpan={6}>Sin acciones registradas todavía.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
