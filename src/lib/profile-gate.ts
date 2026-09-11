import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Server-side profile-completion gate.
 *
 * The edge middleware only trusts the `vela_profile_ready` cookie, which a
 * client can forge. Sensitive handlers call this to re-verify the real
 * `User.profileReady` flag in the database, so a forged cookie cannot bypass
 * onboarding.
 */
export async function requireProfileReady(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileReady: true },
  });

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!user.profileReady) {
    return NextResponse.json(
      { error: "Perfil incompleto. Completa onboarding en /vela" },
      { status: 428 },
    );
  }

  return null;
}
