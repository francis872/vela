import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/lib/user-service";

const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const user = await createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: "operador",
      active: true,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo crear la cuenta. Verifica disponibilidad de base de datos o email único.",
      },
      { status: 500 },
    );
  }
}
