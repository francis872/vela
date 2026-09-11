import { WaitlistSignup } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit-service";

function buildWaitlistDetail(signup: WaitlistSignup) {
  return [
    `Nuevo registro waitlist: ${signup.name}`,
    `email=${signup.email}`,
    `venture=${signup.ventureName}`,
    `stage=${signup.stage ?? "validation"}`,
    `city=${signup.city ?? "n/a"}`,
    `beta=${signup.interestedInBeta ? "yes" : "no"}`,
  ].join(" | ");
}

export async function notifyWaitlistSignup(signup: WaitlistSignup) {
  await writeAuditLog({
    action: "waitlist_signup_created",
    module: "waitlist",
    detail: buildWaitlistDetail(signup),
  });

  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { delivered: false, channel: "audit" as const };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "waitlist.signup.created",
      source: "vela",
      signup: {
        id: signup.id,
        name: signup.name,
        email: signup.email,
        phone: signup.phone,
        city: signup.city,
        ventureName: signup.ventureName,
        sector: signup.sector,
        stage: signup.stage,
        monthlyRevenue: signup.monthlyRevenue,
        mainNeed: signup.mainNeed,
        interestedInBeta: signup.interestedInBeta,
        status: signup.status,
        createdAt: signup.createdAt,
      },
      message: `${signup.name} se unió a la waitlist de VELA`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook waitlist failed with status ${response.status}`);
  }

  return { delivered: true, channel: "webhook" as const };
}