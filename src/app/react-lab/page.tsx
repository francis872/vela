"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const ReactLabApp = dynamic(() => import("@/features/react-lab/react-lab-app"), {
  ssr: false,
});

export default function ReactLabPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 md:px-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">VELA · REACT ADVANCED</p>
          <h1 className="text-3xl font-bold">Laboratorio React avanzado</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            HashRouter, rutas dinámicas, nested routes, contexto, hooks custom, localStorage,
            portal modal, loading skeletons, search URL, complete/delete y tipado TypeScript.
          </p>
          <Link href="/vela" className="text-sm font-semibold underline">
            Volver a VELA Home
          </Link>
        </header>

        <ReactLabApp />
      </main>
    </div>
  );
}
