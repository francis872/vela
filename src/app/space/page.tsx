import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import OsNav from "@/components/os-nav";
import SpacePage from "./space-page";

export const dynamic = "force-dynamic";

export default async function Space() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/");
  const session = await verifySession(token).catch(() => null);
  if (!session) redirect("/");

  return (
    <div className="os-layout">
      <OsNav userName={session.name} userRole={session.role} />
      <main className="os-main">
        <SpacePage userName={session.name} userRole={session.role} />
      </main>
    </div>
  );
}
