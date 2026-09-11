"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import BrandLogo from "@/components/brand-logo";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", position: "", trajectory: "", bio: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, age: null, contact: "" }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to complete onboarding.");
      router.replace("/vela"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to complete onboarding."); setLoading(false); }
  }

  return <main className="access-state onboarding-state"><Link href="/launch" className="access-state-logo"><BrandLogo variant="wordmark" /></Link><span className="access-eyebrow">BEGIN WITH VELA · 03</span><h1>What are you building?</h1><p>Give VELA enough context to make your first Venture Pulse useful.</p><form className="access-form access-state-form" onSubmit={submit}><label>Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></label><label>Your role<input placeholder="Founder, operator..." value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></label><label>Where are you in the journey?<textarea rows={2} value={form.trajectory} onChange={(e) => setForm({ ...form, trajectory: e.target.value })} /></label><label>What is the biggest challenge right now?<textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label><button className="access-submit" type="submit" disabled={loading}>{loading ? "Opening VELA..." : "Enter VELA OS"}<span>→</span></button>{error && <p className="access-error" role="alert">{error}</p>}</form></main>;
}
