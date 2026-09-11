"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import BrandLogo from "@/components/brand-logo";

const LAST_EMAIL_KEY = "vela-last-email";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void Promise.resolve().then(() => { const saved = window.localStorage.getItem(LAST_EMAIL_KEY); if (saved) setEmail(saved); }); }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({})) as { user?: { role: string }; mfaRequired?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
      if (data.mfaRequired) { router.replace(`/login/mfa-challenge${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`); return; }
      router.replace(nextPath && nextPath !== "/" ? nextPath : "/vela"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); setLoading(false); }
  }

  return <div className="access-form-panel"><span className="access-eyebrow">VELA ACCESS</span><h1>Welcome back.</h1><p className="access-lede">Continue building what comes next.</p><form onSubmit={onSubmit} className="access-form"><label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><div className="access-form-row"><label className="access-check"><input type="checkbox" /> Keep me signed in</label><Link href="/forgot-password">Forgot your password?</Link></div><button className="access-submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}<span>→</span></button>{error && <p className="access-error" role="alert">{error}</p>}</form><p className="access-switch">New to VELA? <Link href={`/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>Create account</Link></p></div>;
}

export default function LoginPage() { return <main className="access-shell"><section className="access-visual"><Link href="/launch" className="access-brand"><BrandLogo variant="wordmark" priority /><span>VENTURE OPERATING SYSTEM</span></Link><div className="access-visual-copy"><span>DISCIPLINE TODAY.<br />A BRIGHTER TOMORROW.</span><h2>Ideas move<br />the world.</h2><p>VELA gives founders the operating system to turn ambition into extraordinary companies.</p></div></section><section className="access-panel"><div className="access-panel-top"><span>ALREADY BUILDING?</span><Link href="/signup">Create account →</Link></div><Suspense fallback={<div className="access-form-panel">Loading access...</div>}><LoginForm /></Suspense><div className="access-footer-mark">VELA <span>IDEAS MOVE THE WORLD</span></div></section></main>; }
