import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { resolveVentureForUser } from "@/lib/venture-access";
import { capabilitiesFor } from "@/lib/capabilities";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const ventureId = new URL(req.url).searchParams.get("ventureId");
  const resolved = await resolveVentureForUser(auth.session.sub, ventureId);
  if (!resolved) return NextResponse.json({ venture: null, capabilities: [], membership: null });
  return NextResponse.json({
    venture: resolved.venture,
    membership: resolved.context.membership,
    capabilities: capabilitiesFor(resolved.context),
  });
}
