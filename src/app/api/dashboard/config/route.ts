import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import {
  getDashboardThresholds,
  updateDashboardThresholds,
} from "@/lib/dashboard-config";
import { requireProfileReady } from "@/lib/profile-gate";

const thresholdSchema = z.object({
  iev: z.object({
    healthy: z.number().min(0).max(100),
    warning: z.number().min(0).max(100),
  }),
  confidence: z.object({
    healthy: z.number().min(0).max(100),
    warning: z.number().min(0).max(100),
  }),
  averageFailureRisk: z.object({
    healthyMax: z.number().min(0).max(100),
    warningMax: z.number().min(0).max(100),
  }),
  highRiskShare: z.object({
    healthyMax: z.number().min(0).max(100),
    warningMax: z.number().min(0).max(100),
  }),
});

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin", "analista"]);

  if (!auth.ok) {
    return auth.response;
  }

  const profileGate = await requireProfileReady(auth.session.sub);
  if (profileGate) return profileGate;

  try {
    const thresholds = await getDashboardThresholds();
    return NextResponse.json({ thresholds });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar la configuración del dashboard" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await request.json();
    const parsed = thresholdSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Configuración inválida", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const thresholds = await updateDashboardThresholds(parsed.data);
    return NextResponse.json({ thresholds });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la configuración del dashboard" },
      { status: 500 },
    );
  }
}