import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit-service";

/**
 * MFAService — TOTP (RFC 6238) foundation.
 *
 * - Secrets are generated server-side and never logged.
 * - Recovery codes are stored hashed (SHA-256), single-use.
 * - Enrollment is NOT active until the first valid TOTP confirms ownership of
 *   the authenticator (mfaEnabled flips only after a successful verify).
 *
 * Note: TOTP secrets are stored at rest protected by the database encryption
 * provided by the platform (Neon). Field-level encryption can be layered on
 * later behind this service without changing callers.
 */

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: bigint): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/** Verify a TOTP code allowing ±1 period of clock drift. */
export function verifyTotp(secret: string, code: string): boolean {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD));
  for (const drift of [BigInt(-1), BigInt(0), BigInt(1)]) {
    const expected = hotp(secret, counter + drift);
    if (
      expected.length === normalized.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))
    ) {
      return true;
    }
  }
  return false;
}

export type MfaSetup = {
  secret: string;
  otpauthUrl: string;
  recoveryCodes: string[]; // plaintext, shown ONCE to the user
};

/** Start enrollment: generate a pending secret and recovery codes. */
export async function startMfaEnrollment(userId: string, email: string): Promise<MfaSetup> {
  const secret = base32Encode(randomBytes(20));
  const issuer = "VELA";
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    email,
  )}?secret=${secret}&issuer=${issuer}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

  const recoveryCodes = Array.from({ length: 10 }, () =>
    randomBytes(4).toString("hex").toUpperCase().replace(/(.{4})/, "$1-"),
  );

  // Replace any previous (unconfirmed) enrollment atomically.
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret, mfaEnabled: false } }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId, usedAt: null } }),
    prisma.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ userId, codeHash: sha256(code) })),
    }),
  ]);

  return { secret, otpauthUrl, recoveryCodes };
}

/** Confirm enrollment: first valid TOTP activates MFA. */
export async function confirmMfaEnrollment(
  userId: string,
  code: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true },
  });
  if (!user?.mfaSecret) return false;

  if (!verifyTotp(user.mfaSecret, code)) {
    await prisma.securityEvent.create({
      data: { userId, type: "mfa_challenge_failed", detail: "enrollment", ip: meta?.ip, userAgent: meta?.userAgent },
    }).catch(() => undefined);
    return false;
  }

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  await writeAuditLog({
    userId,
    action: "mfa_enabled",
    module: "security",
    detail: "MFA TOTP activado",
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return true;
}

/** Disable MFA and invalidate recovery codes. */
export async function disableMfa(
  userId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
  ]);
  await writeAuditLog({
    userId,
    action: "mfa_disabled",
    module: "security",
    detail: "MFA desactivado",
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

/** Verify a login-time second factor: TOTP first, then single-use recovery code. */
export async function verifyMfaChallenge(
  userId: string,
  code: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true },
  });
  if (!user?.mfaSecret) return false;

  if (verifyTotp(user.mfaSecret, code)) return true;

  // Recovery code path (single-use)
  const recovery = await prisma.mfaRecoveryCode.findFirst({
    where: { userId, codeHash: sha256(code.toUpperCase()), usedAt: null },
  });
  if (recovery) {
    await prisma.mfaRecoveryCode.update({
      where: { id: recovery.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  await prisma.securityEvent.create({
    data: { userId, type: "mfa_challenge_failed", detail: "login", ip: meta?.ip, userAgent: meta?.userAgent },
  }).catch(() => undefined);
  return false;
}

export async function getMfaStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });
  const recoveryRemaining = await prisma.mfaRecoveryCode.count({
    where: { userId, usedAt: null },
  });
  return {
    enabled: user?.mfaEnabled ?? false,
    recoveryCodesRemaining: user?.mfaEnabled ? recoveryRemaining : 0,
  };
}
