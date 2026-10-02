import { prisma } from "@/lib/prisma";

export type AccessScope = "user" | "venture" | "organization" | "relationship" | "platform";

export type ContextMembership =
  | { kind: "owner"; id: string; role: "owner"; status: "active" }
  | { kind: "venture"; id: string; role: string; status: string }
  | { kind: "organization"; id: string; role: string; status: string }
  | { kind: "platform"; id: string; role: string; status: "active" };

export type AccessContext = {
  scope: AccessScope;
  scopeId: string;
  userId: string;
  membership: ContextMembership;
};

export async function resolveAccessContext(input: {
  userId: string;
  scope: AccessScope;
  scopeId?: string;
}): Promise<AccessContext | null> {
  const { userId, scope, scopeId } = input;

  if (scope === "user") {
    if (scopeId && scopeId !== userId) return null;
    return { scope, scopeId: userId, userId, membership: { kind: "owner", id: userId, role: "owner", status: "active" } };
  }

  if (scope === "platform") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, active: true, status: true } });
    if (!user || !user.active || user.status !== "active") return null;
    return { scope, scopeId: "platform", userId, membership: { kind: "platform", id: user.id, role: user.role, status: "active" } };
  }

  if (!scopeId) return null;

  if (scope === "venture") {
    const venture = await prisma.venture.findUnique({ where: { id: scopeId }, select: { id: true, ownerId: true } });
    if (!venture) return null;
    if (venture.ownerId === userId) {
      return { scope, scopeId, userId, membership: { kind: "owner", id: venture.id, role: "owner", status: "active" } };
    }
    const member = await prisma.ventureMember.findUnique({
      where: { ventureId_userId: { ventureId: scopeId, userId } },
      select: { id: true, role: true, status: true },
    });
    if (!member || member.status !== "active") return null;
    return { scope, scopeId, userId, membership: { kind: "venture", ...member } };
  }

  if (scope === "organization") {
    const member = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId: scopeId, userId } },
      select: { id: true, role: true, status: true },
    });
    if (!member || member.status !== "active") return null;
    return { scope, scopeId, userId, membership: { kind: "organization", ...member } };
  }

  // Relationship records are intentionally not authorization grants.
  return null;
}
