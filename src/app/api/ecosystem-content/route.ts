import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import {
  ensureEcosystemSeedContent,
  listEcosystemContent,
  type EcosystemModule,
} from "@/lib/ecosystem-content-service";

const moduleSchema = z.enum(["human", "space", "adventure"]);

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin", "analista", "operador"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    await ensureEcosystemSeedContent();

    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get("module");
    const parsedModule = moduleParam ? moduleSchema.safeParse(moduleParam) : null;

    if (moduleParam && !parsedModule?.success) {
      return NextResponse.json({ error: "Modulo invalido" }, { status: 400 });
    }

    const module = parsedModule?.success
      ? (parsedModule.data as EcosystemModule)
      : undefined;

    const content = await listEcosystemContent(module);

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar contenido" }, { status: 500 });
  }
}
