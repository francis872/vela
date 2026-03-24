import { NextResponse } from "next/server";
import { z } from "zod";
import { PROFILE_READY_COOKIE, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFallbackProfile, setFallbackProfile } from "@/lib/profile-store";

const profileSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(13).max(120).nullable(),
  trajectory: z.string().max(2000),
  contact: z.string().max(300),
  position: z.string().max(200),
  bio: z.string().max(2000),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.session.sub },
      select: {
        name: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const fallback = getFallbackProfile(auth.session.sub, {
      name: user.name,
      age: null,
      trajectory: "",
      contact: auth.session.email,
      position: "",
      bio: "",
      role: user.role,
      profileReady: false,
    });

    const response = NextResponse.json({ profile: fallback });
    response.cookies.set({
      name: PROFILE_READY_COOKIE,
      value: fallback.profileReady ? "true" : "false",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    const fallback = getFallbackProfile(auth.session.sub, {
      name: auth.session.name,
      age: null,
      trajectory: "",
      contact: auth.session.email,
      position: "",
      bio: "",
      role: auth.session.role,
      profileReady: false,
    });

    const response = NextResponse.json({ profile: fallback });
    response.cookies.set({
      name: PROFILE_READY_COOKIE,
      value: fallback.profileReady ? "true" : "false",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }
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

  try {

    const updatedUser = await prisma.user.update({
      where: { id: auth.session.sub },
      data: {
        name: parsed.data.name,
      },
      select: {
        role: true,
      },
    });

    const profile = setFallbackProfile(auth.session.sub, {
      ...parsed.data,
      role: updatedUser.role,
      profileReady: true,
    });

    const response = NextResponse.json({ profile });
    response.cookies.set({
      name: PROFILE_READY_COOKIE,
      value: "true",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    const fallback = setFallbackProfile(auth.session.sub, {
      ...parsed.data,
      role: auth.session.role,
      profileReady: true,
    });

    const response = NextResponse.json({ profile: fallback });
    response.cookies.set({
      name: PROFILE_READY_COOKIE,
      value: "true",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }
}
