import { prisma } from "@/lib/prisma";
import { generateSecureToken, sha256 } from "@/lib/security";
import { getEmailDeliveryProvider } from "@/lib/security-providers";
import { writeAuditLog } from "@/lib/audit-service";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * EmailVerificationService
 *
 * Issues single-use, expiring, hashed verification tokens and activates the
 * account only after email ownership is proven.
 */
export async function issueVerificationToken(params: {
  userId: string;
  email: string;
  name: string;
  origin: string;
  ip?: string;
  userAgent?: string;
}) {
  const { userId, email, name, origin, ip, userAgent } = params;

  // Invalidate any outstanding tokens for this user
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateSecureToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const publicOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
  const verificationUrl = `${publicOrigin}/api/auth/verify-email?token=${token}`;

  const delivery = await getEmailDeliveryProvider().sendVerification({
    to: email,
    name,
    verificationUrl,
  });

  await writeAuditLog({
    userId,
    action: "email_verification_sent",
    module: "auth",
    detail: `Verificación emitida para ${email} (canal: ${delivery.channel})`,
    ip,
    userAgent,
  });

  return { verificationUrl, delivered: delivery.delivered };
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function verifyEmailToken(token: string, meta?: { ip?: string; userAgent?: string }): Promise<VerifyResult> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
  });

  if (!record) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt <= new Date()) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { status: "active", emailVerifiedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    userId: record.userId,
    action: "email_verified",
    module: "auth",
    detail: "Email verificado; cuenta activa",
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });

  return { ok: true, userId: record.userId };
}
