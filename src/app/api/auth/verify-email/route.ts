import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email-verification-service";
import { getRequestMeta } from "@/lib/security";

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/login?verified=missing`);
  }

  const meta = getRequestMeta(request);
  const result = await verifyEmailToken(token, meta);

  if (!result.ok) {
    return NextResponse.redirect(`${origin}/login?verified=${result.reason}`);
  }

  return NextResponse.redirect(`${origin}/login?verified=success`);
}

/** Programmatic variant for API clients. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;

  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const meta = getRequestMeta(request);
  const result = await verifyEmailToken(token, meta);

  if (!result.ok) {
    return NextResponse.json({ error: `Token ${result.reason}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
