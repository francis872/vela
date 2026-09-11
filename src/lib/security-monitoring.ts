import { prisma } from "@/lib/prisma";

/**
 * Security monitoring — aggregates existing AccessLog/SecurityEvent evidence
 * into internal anomaly signals. Signals inform review; they never
 * auto-block on a single indicator.
 */

export type SecurityAlert = {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  detail: string;
  evidenceCount: number;
};

export async function detectSecurityAnomalies(): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Many failed logins from one IP in the last hour
  const failedByIp = await prisma.accessLog.groupBy({
    by: ["ip"],
    where: { success: false, createdAt: { gte: oneHourAgo } },
    _count: { _all: true },
    having: { ip: { _count: { gt: 10 } } },
  });
  for (const row of failedByIp) {
    alerts.push({
      type: "login_bruteforce_signal",
      severity: row._count._all > 30 ? "HIGH" : "MEDIUM",
      detail: `${row._count._all} intentos fallidos desde un mismo origen en la última hora`,
      evidenceCount: row._count._all,
    });
  }

  // Account creation velocity per IP (24h)
  const registrationsByIp = await prisma.accessLog.groupBy({
    by: ["ip"],
    where: { reason: "register_success", createdAt: { gte: oneDayAgo } },
    _count: { _all: true },
    having: { ip: { _count: { gt: 5 } } },
  });
  for (const row of registrationsByIp) {
    alerts.push({
      type: "account_creation_velocity",
      severity: "MEDIUM",
      detail: `${row._count._all} cuentas creadas desde un mismo origen en 24h`,
      evidenceCount: row._count._all,
    });
  }

  // Repeated MFA failures per user (24h)
  const mfaFailures = await prisma.securityEvent.groupBy({
    by: ["userId"],
    where: { type: "mfa_challenge_failed", createdAt: { gte: oneDayAgo } },
    _count: { _all: true },
    having: { userId: { _count: { gt: 5 } } },
  });
  for (const row of mfaFailures) {
    alerts.push({
      type: "mfa_failure_pattern",
      severity: "HIGH",
      detail: `Múltiples fallos de MFA (${row._count._all}) en 24h para una cuenta`,
      evidenceCount: row._count._all,
    });
  }

  return alerts;
}
