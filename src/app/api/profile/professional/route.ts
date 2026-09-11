import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { addSkill, getMyProfile, removeSkill, upsertMyProfile } from "@/lib/profile-service";

const profileSchema = z.object({
  headline: z.string().max(160).nullable().optional(),
  summary: z.string().max(2000).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  availability: z.string().max(40).nullable().optional(),
  visibility: z.string().max(20).nullable().optional(),
  interests: z.array(z.string().max(60)).max(20).optional(),
});

/** GET /api/profile/professional — my professional profile + skills. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const data = await getMyProfile(auth.session.sub);
  return NextResponse.json(data);
}

/** PUT /api/profile/professional — upsert my professional profile. */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const payload = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const profile = await upsertMyProfile(auth.session.sub, parsed.data);
  return NextResponse.json({ profile });
}

/** POST /api/profile/professional — action: add_skill | remove_skill */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;

  if (action === "add_skill") {
    const name = typeof body?.name === "string" ? body.name : "";
    const proficiency = typeof body?.proficiency === "string" ? body.proficiency : null;
    if (!name.trim()) return NextResponse.json({ error: "skill name required" }, { status: 400 });
    const skill = await addSkill(auth.session.sub, name, proficiency);
    return NextResponse.json({ skill }, { status: 201 });
  }

  if (action === "remove_skill") {
    const skillId = typeof body?.skillId === "string" ? body.skillId : null;
    if (!skillId) return NextResponse.json({ error: "skillId required" }, { status: 400 });
    const removed = await removeSkill(auth.session.sub, skillId);
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
