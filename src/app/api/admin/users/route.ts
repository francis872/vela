import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createUser, listUsers, updateUser } from "@/lib/user-service";

const roleSchema = z.enum(["admin", "analista", "operador"]);

const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(2),
  role: roleSchema,
  password: z.string().min(6),
  active: z.boolean().optional(),
});

const updateUserSchema = z.object({
  id: z.string().min(1),
  email: z.email().optional(),
  name: z.string().min(2).optional(),
  role: roleSchema.optional(),
  password: z.string().min(6).optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "No se pudieron listar usuarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json();
    const parsed = createUserSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const user = await createUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear usuario" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = await request.json();
    const parsed = updateUserSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const user = await updateUser(parsed.data);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar usuario" }, { status: 500 });
  }
}
