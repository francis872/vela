import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import OsNav from "@/components/os-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  let name: string | undefined;
  let role: string | undefined;
  if (token) {
    const session = await verifySession(token).catch(() => null);
    if (session) { name = session.name; role = session.role; }
  }
  return (
    <div className="os-layout">
      <OsNav userName={name} userRole={role} />
      <div className="os-main">{children}</div>
    </div>
  );
}
