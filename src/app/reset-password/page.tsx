"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

function ResetForm() {
  const router = useRouter(); const params = useSearchParams(); const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); if (!token) return setError("Recovery token not found."); if (password.length < 8) return setError("Password must be at least 8 characters."); if (password !== confirm) return setError("Passwords do not match."); setLoading(true); try { const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }); const data = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(data.error || "Unable to reset password."); setMessage("Password updated. Redirecting to sign in..."); setTimeout(() => router.replace("/login"), 700); } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset password."); } finally { setLoading(false); } }
  return <main className="access-state"><span className="access-eyebrow">RESET ACCESS</span><h1>Create a new password.</h1><p>Choose a secure password for your VELA account.</p><form className="access-form access-state-form" onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label>Repeat password<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label><button className="access-submit" disabled={loading}>{loading ? "Updating..." : "Update password"}<span>→</span></button>{message && <p className="access-success">{message}</p>}{error && <p className="access-error">{error}</p>}</form><Link href="/login" className="access-back">Return to sign in</Link></main>;
}

export default function ResetPasswordPage() { return <Suspense fallback={<main className="access-state">Loading reset...</main>}><ResetForm /></Suspense>; }
