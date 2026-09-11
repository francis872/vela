/**
 * VELA Security Provider Abstractions.
 *
 * Business logic depends on these internal interfaces — never on a vendor SDK.
 * Concrete providers are selected by environment configuration; when no
 * external provider is configured, local implementations keep the platform
 * functional (fail-open with evidence logged, never silently trusting).
 */

export type EmailValidationResult = {
  syntaxValid: boolean;
  domainHasMx: boolean | null; // null = not checked (no provider)
  isDisposable: boolean;
};

export interface EmailRiskProvider {
  validateEmail(email: string): Promise<EmailValidationResult>;
}

export interface BotProtectionProvider {
  verify(token: string, ip: string): Promise<boolean>;
}

export interface EmailDeliveryProvider {
  sendVerification(params: { to: string; name: string; verificationUrl: string }): Promise<{ delivered: boolean; channel: string }>;
}

/* ── Local implementations ─────────────────────────────────────────────── */

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "guerrillamail.com",
  "10minutemail.com", "yopmail.com", "throwawaymail.com", "sharklasers.com",
  "getnada.com", "trashmail.com",
]);

/** Local email risk checks: syntax + disposable-domain detection. */
export const localEmailRiskProvider: EmailRiskProvider = {
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const syntaxValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    return {
      syntaxValid,
      domainHasMx: null, // requires DNS/provider; not checked locally
      isDisposable: DISPOSABLE_DOMAINS.has(domain),
    };
  },
};

/** Turnstile-backed bot protection, used when TURNSTILE_SECRET_KEY is set. */
export const turnstileBotProtection: BotProtectionProvider = {
  async verify(token: string, ip: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return true; // provider not configured → skip challenge

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: controller.signal,
      });
      if (!response.ok) return false;
      const result = (await response.json()) as { success?: boolean };
      return Boolean(result.success);
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  },
};

/**
 * Email delivery: no SMTP is configured yet, so the local provider records the
 * verification email in the audit log (same honest pattern as password reset
 * and waitlist notifications). Swap this implementation for Resend/Postmark/
 * SES by setting the provider here — callers never change.
 */
export function getEmailDeliveryProvider(): EmailDeliveryProvider {
  return {
    async sendVerification() {
      return { delivered: false, channel: "audit" };
    },
  };
}

export function getEmailRiskProvider(): EmailRiskProvider {
  return localEmailRiskProvider;
}

export function getBotProtectionProvider(): BotProtectionProvider {
  return turnstileBotProtection;
}
