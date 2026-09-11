import { prisma } from "@/lib/prisma";
import { getEmailRiskProvider } from "@/lib/security-providers";

/**
 * VELA Registration Risk Engine.
 *
 * Deterministic, explainable risk signals. A signal is evidence, not proof:
 * HIGH risk triggers stronger verification, never an accusation.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type RiskAssessment = {
  riskLevel: RiskLevel;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  signals: string[];
  generatedAt: string;
};

export async function assessRegistrationRisk(params: {
  email: string;
  ip: string;
}): Promise<RiskAssessment> {
  const { email, ip } = params;
  const signals: string[] = [];
  let score = 0;

  // Signal: email syntax + disposable domain
  try {
    const validation = await getEmailRiskProvider().validateEmail(email);
    if (!validation.syntaxValid) {
      score += 3;
      signals.push("email_syntax_invalid");
    }
    if (validation.isDisposable) {
      score += 2;
      signals.push("disposable_email_domain");
    }
  } catch {
    signals.push("email_risk_provider_unavailable");
  }

  // Signal: account creation velocity from this IP (last 24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFromIp = await prisma.accessLog.count({
      where: {
        ip,
        reason: "register_success",
        createdAt: { gte: since },
      },
    });
    if (recentFromIp >= 5) {
      score += 3;
      signals.push("high_account_creation_velocity");
    } else if (recentFromIp >= 2) {
      score += 1;
      signals.push("multiple_recent_registrations_same_origin");
    }
  } catch {
    signals.push("velocity_check_unavailable");
  }

  // Signal: recent failed attempts from this IP
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const failures = await prisma.accessLog.count({
      where: { ip, success: false, createdAt: { gte: since } },
    });
    if (failures >= 10) {
      score += 2;
      signals.push("elevated_failed_attempts");
    }
  } catch {
    // non-fatal
  }

  const riskLevel: RiskLevel =
    score >= 5 ? "CRITICAL" : score >= 3 ? "HIGH" : score >= 1 ? "MEDIUM" : "LOW";
  const confidence: RiskAssessment["confidence"] =
    signals.length === 0 ? "MEDIUM" : signals.some((s) => s.endsWith("_unavailable")) ? "LOW" : "MEDIUM";

  return { riskLevel, confidence, signals, generatedAt: new Date().toISOString() };
}
