"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import BrandLogo from "@/components/brand-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to process recovery.");
      setMessage("If the email exists, recovery instructions are on their way.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to process recovery."); } finally { setLoading(false); }
  }

  return <main className="access-state"><Link href="/launch" className="access-state-logo"><BrandLogo variant="wordmark" /></Link><span className="access-eyebrow">RECOVER ACCESS</span><h1>Find your way back.</h1><p>Enter your email and we will send a secure recovery route if the account exists.</p><form className="access-form access-state-form" onSubmit={submit}><label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><button className="access-submit" disabled={loading}>{loading ? "Sending..." : "Send instructions"}<span>→</span></button>{message && <p className="access-success">{message}</p>}{error && <p className="access-error">{error}</p>}</form><Link href="/login" className="access-back">Return to sign in</Link></main>;
}
