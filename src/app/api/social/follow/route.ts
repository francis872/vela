import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { followUser, getFollowStats, unfollowUser } from "@/lib/social-service";

const targetSchema = z.object({ userId: z.string().min(1) });

/** GET /api/social/follow?userId=X — follow stats for a user (default: me). */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const userId = new URL(request.url).searchParams.get("userId") ?? auth.session.sub;
  const stats = await getFollowStats(userId);
  return NextResponse.json(stats);
}

/** POST /api/social/follow — follow a user. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const rlKey = `follow:${auth.session.sub}`;
  const rate = checkRateLimit(rlKey, { maxAttempts: 60, windowMs: 60 * 1000, blockMs: 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: `Demasiadas acciones. Intenta en ${rate.retryAfterSeconds}s.` }, { status: 429 });
  }

  const parsed = targetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "userId required" }, { status: 400 });

  consumeRateLimit(rlKey, { maxAttempts: 60, windowMs: 60 * 1000, blockMs: 60 * 1000 });

  const result = await followUser(auth.session.sub, parsed.data.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/social/follow — unfollow a user. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await unfollowUser(auth.session.sub, userId);
  return NextResponse.json({ ok: true });
}
