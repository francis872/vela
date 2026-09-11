import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-service";
import { getRequestMeta } from "@/lib/security";
import {
  normalizeWaitlistSignup,
  waitlistSignupSchema,
} from "@/lib/waitlist";
import { notifyWaitlistSignup } from "@/lib/waitlist-notifications";

const waitlistStatusSchema = z.enum(["pending", "contacted", "signup", "opted_out"]);

const updateWaitlistSchema = z.object({
  id: z.string().min(1),
  status: waitlistStatusSchema,
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  sector: z.string().trim().max(120).optional().or(z.literal("")),
  stage: z.enum(["idea", "validation", "traction", "growth"]).optional(),
  mainNeed: z.string().trim().max(2000).optional().or(z.literal("")),
});

function hasValidWaitlistAdminKey(request: NextRequest) {
  const requiredAccessKey = process.env.WAITLIST_ACCESS_KEY?.trim();

  if (!requiredAccessKey) {
    return true;
  }

  const providedAccessKey = request.headers.get("x-waitlist-access-key")?.trim();
  return providedAccessKey === requiredAccessKey;
}

function parseCsvEnv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasWaitlistAdminAllowlistAccess(request: NextRequest, email: string) {
  const allowedEmails = parseCsvEnv(process.env.WAITLIST_ADMIN_EMAILS).map((item) =>
    item.toLowerCase(),
  );
  const allowedIps = parseCsvEnv(process.env.WAITLIST_ADMIN_IPS);
  const { ip } = getRequestMeta(request);

  const emailAllowed =
    allowedEmails.length === 0 || allowedEmails.includes(email.trim().toLowerCase());
  const ipAllowed = allowedIps.length === 0 || allowedIps.includes(ip);

  return emailAllowed && ipAllowed;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = waitlistSignupSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = normalizeWaitlistSignup(parsed.data);

    const existing = await prisma.waitlistSignup.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "Este email ya está registrado",
          signup: {
            id: existing.id,
            status: existing.status,
            createdAt: existing.createdAt,
          },
        },
        { status: 409 },
      );
    }

    const signup = await prisma.waitlistSignup.create({
      data,
    });

    try {
      await notifyWaitlistSignup(signup);
    } catch (notificationError) {
      console.error("Waitlist notification error:", notificationError);
    }

    return NextResponse.json({
      success: true,
      id: signup.id,
      message: "Registro completado. Tu solicitud quedó guardada en la lista de espera.",
    });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Error al registrarse" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidWaitlistAdminKey(request)) {
    return NextResponse.json(
      { error: "Clave de acceso inválida para gestionar la waitlist." },
      { status: 403 },
    );
  }

  if (!hasWaitlistAdminAllowlistAccess(request, auth.session.email)) {
    return NextResponse.json(
      { error: "Tu usuario o IP no están autorizados para gestionar la waitlist." },
      { status: 403 },
    );
  }

  try {
    const payload = await request.json();
    const parsed = updateWaitlistSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const signup = await prisma.waitlistSignup.update({
      where: { id: data.id },
      data: {
        status: data.status,
        phone: data.phone === undefined ? undefined : data.phone || null,
        city: data.city === undefined ? undefined : data.city || null,
        sector: data.sector === undefined ? undefined : data.sector || null,
        stage: data.stage,
        mainNeed: data.mainNeed === undefined ? undefined : data.mainNeed || null,
      },
    });

    await writeAuditLog({
      userId: auth.session.sub,
      action: "waitlist_signup_updated",
      module: "waitlist",
      detail: `signup=${signup.id} status=${signup.status}`,
    });

    return NextResponse.json({ signup });
  } catch (error) {
    console.error("Waitlist update error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el registro" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidWaitlistAdminKey(request)) {
    return NextResponse.json(
      { error: "Clave de acceso inválida para gestionar la waitlist." },
      { status: 403 },
    );
  }

  if (!hasWaitlistAdminAllowlistAccess(request, auth.session.email)) {
    return NextResponse.json(
      { error: "Tu usuario o IP no están autorizados para gestionar la waitlist." },
      { status: 403 },
    );
  }

  try {
    const signups = await prisma.waitlistSignup.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ signups });
  } catch (error) {
    console.error("Waitlist fetch error:", error);
    return NextResponse.json(
      { error: "Error al obtener lista" },
      { status: 500 },
    );
  }
}
