"use client";

export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
