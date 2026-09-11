import { NextResponse } from "next/server";
import { z } from "zod";
import { PROFILE_READY_COOKIE, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(13).max(120).nullable(),
  trajectory: z.string().max(2000),
  contact: z.string().max(300),
  position: z.string().max(200),
  bio: z.string().max(2000),
});

const PROFILE_SELECT = {
  name: true,
  role: true,
  age: true,
  trajectory: true,
  contact: true,
  position: true,
  bio: true,
  profileReady: true,
} as const;

type ProfileRecord = {
  name: string;
  role: string;
  age: number | null;
  trajectory: string | null;
  contact: string | null;
  position: string | null;
  bio: string | null;
  profileReady: boolean;
};

function toProfile(user: ProfileRecord, emailFallback: string) {
  return {
    name: user.name,
    age: user.age,
    trajectory: user.trajectory ?? "",
    contact: user.contact ?? emailFallback,
    position: user.position ?? "",
    bio: user.bio ?? "",
    role: user.role,
    profileReady: user.profileReady,
  };
}

function profileCookie(response: NextResponse, ready: boolean) {
  response.cookies.set({
    name: PROFILE_READY_COOKIE,
    value: ready ? "true" : "false",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.sub },
    select: PROFILE_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const response = NextResponse.json({ profile: toProfile(user, auth.session.email) });
  return profileCookie(response, user.profileReady);
}

export async function PUT(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de perfil inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: auth.session.sub },
    data: {
      name: parsed.data.name,
      age: parsed.data.age,
      trajectory: parsed.data.trajectory,
      contact: parsed.data.contact,
      position: parsed.data.position,
      bio: parsed.data.bio,
      profileReady: true,
    },
    select: PROFILE_SELECT,
  });

  const response = NextResponse.json({ profile: toProfile(updatedUser, "") });
  return profileCookie(response, true);
}
