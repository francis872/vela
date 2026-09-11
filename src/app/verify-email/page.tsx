"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
  const params = useSearchParams();
  const url = params.get("url");
  return <main className="access-state"><div className="access-state-mark">VELA</div><span className="access-eyebrow">EMAIL VERIFICATION</span><h1>Check your inbox.</h1><p>{url ? "Your account is ready for verification. Open the link below to activate access." : "We sent a verification link to your inbox. Activate your account before signing in."}</p><div className="access-state-actions">{url && <a className="access-submit" href={url}>Verify email <span>→</span></a>}<Link className="public-outline" href="/login">Return to sign in</Link></div></main>;
}

export default function VerifyEmailPage() { return <Suspense fallback={<main className="access-state">Loading verification...</main>}><VerifyContent /></Suspense>; }
