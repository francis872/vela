import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import {
  blockUser,
  listConnections,
  listPendingRequests,
  removeConnection,
  requestConnection,
  respondConnection,
  unblockUser,
} from "@/lib/social-service";

const requestSchema = z.object({
  toUserId: z.string().min(1),
  message: z.string().max(500).optional(),
});

const respondSchema = z.object({
  requestId: z.string().min(1),
  accept: z.boolean(),
});

const targetSchema = z.object({ userId: z.string().min(1) });

/** GET /api/social/connections — my connections + pending requests. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const [connections, requests] = await Promise.all([
    listConnections(auth.session.sub),
    listPendingRequests(auth.session.sub),
  ]);
  return NextResponse.json({ connections, requests });
}

/** POST /api/social/connections — action: request | respond | block | unblock */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const meId = auth.session.sub;

  const rlKey = `connections:${meId}`;
  const rate = checkRateLimit(rlKey, { maxAttempts: 40, windowMs: 60 * 1000, blockMs: 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: `Demasiadas acciones. Intenta en ${rate.retryAfterSeconds}s.` }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;

  let result: { ok: true } | { status: number; error: string };

  if (action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "toUserId required" }, { status: 400 });
    consumeRateLimit(rlKey, { maxAttempts: 40, windowMs: 60 * 1000, blockMs: 60 * 1000 });
    result = await requestConnection(meId, parsed.data.toUserId, parsed.data.message);
  } else if (action === "respond") {
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "requestId and accept required" }, { status: 400 });
    result = await respondConnection(meId, parsed.data.requestId, parsed.data.accept);
  } else if (action === "block") {
    const parsed = targetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "userId required" }, { status: 400 });
    result = await blockUser(meId, parsed.data.userId);
  } else if (action === "unblock") {
    const parsed = targetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "userId required" }, { status: 400 });
    result = await unblockUser(meId, parsed.data.userId);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { status: action === "request" ? 201 : 200 });
}

/** DELETE /api/social/connections?userId=X — remove an existing connection. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await removeConnection(auth.session.sub, userId);
  return NextResponse.json({ ok: true });
}
