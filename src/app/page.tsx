import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import AccessAuthModal from "@/components/access-auth-modal";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const session = await verifySession(token);
    if (session) {
      redirect("/vela");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-14 md:px-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold tracking-wide text-zinc-500">
            VELA · Access Layer
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Accede o crea tu cuenta antes de entrar a los portales
          </h1>
          <p className="max-w-3xl text-zinc-600 dark:text-zinc-300">
            Esta capa es exclusiva para autenticación. Después de iniciar sesión,
            accederás al hub de portales por módulo y por rol.
          </p>
          <nav className="flex flex-wrap gap-3 pt-2">
            <AccessAuthModal />
          </nav>
        </header>
      </main>
    </div>
  );
}
