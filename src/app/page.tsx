import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const session = await verifySession(token);
    if (session) {
      redirect("/vela");
    }
  }

  // Redirect to launch page for public users
  redirect("/launch");
}
