import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setUserPassword } from "@/lib/user-service";
import { revokeAllAuthSessions } from "@/lib/auth-session-service";
import { writeAuditLog } from "@/lib/audit-service";
import { getRequestMeta, sha256 } from "@/lib/security";

const resetSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const { ip, userAgent } = getRequestMeta(request);
  const payload = await request.json().catch(() => null);
  const parsed = resetSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const tokenHash = sha256(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
        id: { not: resetToken.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  await setUserPassword(resetToken.userId, parsed.data.password);
  await revokeAllAuthSessions(resetToken.userId);

  await writeAuditLog({
    userId: resetToken.userId,
    action: "password_reset_completed",
    module: "auth",
    detail: "Contraseña actualizada por token de recuperación",
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
