import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import OsNav from "@/components/os-nav";
import NetworkWorkspace from "./network-workspace";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/");
  const session = await verifySession(token).catch(() => null);
  if (!session) redirect("/");

  return (
    <div className="os-layout">
      <OsNav userName={session.name} userRole={session.role} />
      <main className="os-main">
        <NetworkWorkspace currentUserId={session.sub} userName={session.name} />
      </main>
    </div>
  );
}
