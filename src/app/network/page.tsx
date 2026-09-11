import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import OsNav from "@/components/os-nav";
import PlatformGraphView from "@/app/relay/platform-graph-view";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/");
  const session = await verifySession(token).catch(() => null);
  if (!session) redirect("/");
  return <div className="os-layout"><OsNav userName={session.name} userRole={session.role} /><main className="os-main"><div className="os-page-header"><div><div className="os-page-title">Network</div><div className="os-page-sub">People, connections and relationships that can move a venture forward.</div></div><span className="vela-pill">Real relationships</span></div><PlatformGraphView currentUserId={session.sub} /></main></div>;
}
