import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export default async function OnboardingPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token).catch(() => null) : null;
  if (!session) redirect("/login?next=/onboarding");
  redirect("/vela");
}
