import { prisma } from "@/lib/prisma";
import { resolveAccessContext, type AccessContext } from "@/lib/access-context";
import { hasCapability, type Capability } from "@/lib/capabilities";

export async function resolveVentureForUser(userId: string, requestedVentureId?: string | null): Promise<{
  venture: { id: string; name: string; userId: string };
  context: AccessContext;
} | null> {
  let ventureId = requestedVentureId ?? null;

  if (!ventureId) {
    const owned = await prisma.venture.findUnique({ where: { userId }, select: { id: true } });
    if (owned) ventureId = owned.id;
    else {
      const membership = await prisma.ventureMember.findFirst({
        where: { userId, status: "active" },
        orderBy: { joinedAt: "asc" },
        select: { ventureId: true },
      });
      ventureId = membership?.ventureId ?? null;
    }
  }

  if (!ventureId) return null;

  const context = await resolveAccessContext({ userId, scope: "venture", scopeId: ventureId });
  if (!context) return null;

  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
    select: { id: true, name: true, userId: true },
  });
  return venture ? { venture, context } : null;
}

export async function requireVentureCapabilityForUser(input: {
  userId: string;
  ventureId?: string | null;
  capability: Capability;
}) {
  const resolved = await resolveVentureForUser(input.userId, input.ventureId);
  if (!resolved || !hasCapability(resolved.context, input.capability)) return null;
  return resolved;
}
