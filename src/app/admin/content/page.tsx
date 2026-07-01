"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Module = "human" | "space" | "adventure";

type ContentItem = {
  id: string;
  module: Module;
  category: string;
  title: string;
  summary: string;
  detail: string | null;
  meta: string | null;
  tags: string[];
  sortOrder: number;
  seedKey: string | null;
  createdByName: string | null;
  updatedAt: string;
};

const moduleOptions: Module[] = ["human", "space", "adventure"];

const initialForm = {
  module: "human" as Module,
  category: "talk",
  title: "",
  summary: "",
  detail: "",
  meta: "",
  tags: "",
  sortOrder: 0,
};

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<Module | "all">("all");
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = moduleFilter === "all" ? "" : `?module=${moduleFilter}`;
    const response = await fetch(`/api/admin/ecosystem-content${query}`, { cache: "no-store" });

    if (!response.ok) {
      setError("No se pudo cargar contenido. Solo admins pueden gestionar este recurso.");
      setLoading(false);
      return;
    }

    const payload: { content: ContentItem[] } = await response.json();
    setItems(payload.content);
    setLoading(false);
  }, [moduleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (moduleFilter === "all") {
      return;
    }

    setForm((prev) => ({ ...prev, module: moduleFilter }));
  }, [moduleFilter]);

  const grouped = useMemo(() => {
    return moduleOptions.map((module) => ({
      module,
      items: items.filter((item) => item.module === module),
    }));
  }, [items]);

  const createContent = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/ecosystem-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: form.module,
        category: form.category,
        title: form.title,
        summary: form.summary,
        detail: form.detail || null,
        meta: form.meta || null,
        sortOrder: Number(form.sortOrder) || 0,
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });

    if (!response.ok) {
      setError("No se pudo crear contenido. Verifica campos obligatorios.");
      setSaving(false);
      return;
    }

    setForm((prev) => ({ ...initialForm, module: prev.module }));
    setMessage("Contenido creado correctamente.");
    await load();
    setSaving(false);
  };

  const quickUpdateSort = async (id: string, sortOrder: number) => {
    const response = await fetch("/api/admin/ecosystem-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sortOrder }),
    });

    if (!response.ok) {
      setError("No se pudo actualizar sortOrder.");
      return;
    }

    await load();
  };

  const quickPatch = async (
    id: string,
    payload: Partial<{
      title: string;
      summary: string;
      detail: string | null;
      meta: string | null;
      tags: string[];
    }>,
  ) => {
    const response = await fetch("/api/admin/ecosystem-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });

    if (!response.ok) {
      setError("No se pudo actualizar contenido.");
      return;
    }

    setMessage("Contenido actualizado.");
    await load();
  };

  const removeContent = async (id: string) => {
    const confirmDelete = window.confirm("Esta accion eliminara el contenido. Deseas continuar?");
    if (!confirmDelete) {
      return;
    }

    const response = await fetch("/api/admin/ecosystem-content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      setError("No se pudo eliminar contenido.");
      return;
    }

    setMessage("Contenido eliminado.");
    await load();
  };

  return (
    <div className="vela-shell min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 md:px-10">
        <header className="space-y-3 rounded-2xl border border-border p-6">
          <p className="vela-pill">Admin · Content Studio</p>
          <h1 className="text-3xl font-bold md:text-4xl">Gestion de contenido del ecosistema</h1>
          <p className="text-sm vela-muted">
            Crea y ordena contenido para Human, Space y Vela Adventure sin tocar codigo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/users" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Admin usuarios</Link>
            <Link href="/vela" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Volver a VELA</Link>
          </div>
        </header>

        {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
        {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Filtro de modulo</h2>
            <select
              aria-label="Filtrar modulo"
              title="Filtrar modulo"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value as Module | "all")}
            >
              <option value="all">Todos</option>
              <option value="human">Human</option>
              <option value="space">Space</option>
              <option value="adventure">Vela Adventure</option>
            </select>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Crear contenido</h2>
          <form onSubmit={createContent} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Modulo
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.module}
                onChange={(event) => setForm((prev) => ({ ...prev, module: event.target.value as Module }))}
              >
                <option value="human">Human</option>
                <option value="space">Space</option>
                <option value="adventure">Vela Adventure</option>
              </select>
            </label>

            <label className="text-sm">
              Categoria
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                required
              />
            </label>

            <label className="text-sm md:col-span-2">
              Titulo
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>

            <label className="text-sm md:col-span-2">
              Resumen
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                required
              />
            </label>

            <label className="text-sm md:col-span-2">
              Detalle
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.detail}
                onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))}
              />
            </label>

            <label className="text-sm">
              Meta
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.meta}
                onChange={(event) => setForm((prev) => ({ ...prev, meta: event.target.value }))}
              />
            </label>

            <label className="text-sm">
              Sort order
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))}
              />
            </label>

            <label className="text-sm md:col-span-2">
              Tags (separados por coma)
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </label>

            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="vela-accent-button px-4 py-2 text-sm">
                {saving ? "Guardando..." : "Crear contenido"}
              </button>
            </div>
          </form>
        </section>

        {loading ? <p className="text-sm text-zinc-500">Cargando contenido...</p> : null}

        <section className="space-y-4">
          {grouped.map((group) => (
            <article key={group.module} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <h3 className="text-lg font-semibold capitalize">{group.module}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <label className="block text-xs text-zinc-500">
                      Titulo
                      <input
                        type="text"
                        defaultValue={item.title}
                        onBlur={(event) => quickPatch(item.id, { title: event.target.value })}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </label>

                    <label className="mt-2 block text-xs text-zinc-500">
                      Resumen
                      <input
                        type="text"
                        defaultValue={item.summary}
                        onBlur={(event) => quickPatch(item.id, { summary: event.target.value })}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </label>

                    <label className="mt-2 block text-xs text-zinc-500">
                      Detalle
                      <input
                        type="text"
                        defaultValue={item.detail ?? ""}
                        onBlur={(event) => quickPatch(item.id, { detail: event.target.value || null })}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </label>

                    <label className="mt-2 block text-xs text-zinc-500">
                      Meta
                      <input
                        type="text"
                        defaultValue={item.meta ?? ""}
                        onBlur={(event) => quickPatch(item.id, { meta: event.target.value || null })}
                        className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </label>

                    <label className="mt-2 block text-xs text-zinc-500">
                      Tags (coma separada)
                      <input
                        type="text"
                        defaultValue={item.tags.join(", ")}
                        onBlur={(event) =>
                          quickPatch(item.id, {
                            tags: event.target.value
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          })
                        }
                        className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    </label>

                    <p className="mt-2 text-xs text-zinc-500">{item.category}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <label>
                        sort
                        <input
                          type="number"
                          min={0}
                          defaultValue={item.sortOrder}
                          onBlur={(event) => quickUpdateSort(item.id, Number(event.target.value) || 0)}
                          className="ml-2 w-16 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                        />
                      </label>
                      <span className="text-zinc-500">{item.seedKey ? "seed" : "custom"}</span>
                      <button
                        type="button"
                        onClick={() => removeContent(item.id)}
                        className="rounded-md border border-red-300 px-2 py-1 font-semibold text-red-600"
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
                {group.items.length === 0 ? <li className="text-zinc-500">Sin contenido.</li> : null}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
