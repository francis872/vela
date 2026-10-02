import type { AccessContext } from "@/lib/access-context";

export const CAPABILITIES = [
  "venture.read",
  "venture.objectives.read","venture.objectives.write","venture.objectives.delete",
  "venture.validation.read","venture.validation.write","venture.validation.delete",
  "venture.resources.read","venture.resources.write",
  "venture.team.read","venture.team.manage",
  "organization.portfolio.read","organization.members.read","organization.members.manage",
  "investment.opportunity.read","investment.opportunity.review",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ALL_VENTURE: Capability[] = CAPABILITIES.filter((c) => c.startsWith("venture.")) as Capability[];
const ALL_ORG: Capability[] = CAPABILITIES.filter((c) => c.startsWith("organization.")) as Capability[];

const ventureRoleCapabilities: Record<string, Capability[]> = {
  owner: ALL_VENTURE,
  founder: ALL_VENTURE,
  cofounder: ALL_VENTURE,
  operator: ["venture.read","venture.objectives.read","venture.objectives.write","venture.validation.read","venture.validation.write","venture.resources.read","venture.resources.write","venture.team.read"],
  member: ["venture.read","venture.objectives.read","venture.objectives.write","venture.validation.read","venture.validation.write","venture.resources.read","venture.team.read"],
  advisor: ["venture.read","venture.objectives.read","venture.validation.read","venture.resources.read","venture.team.read"],
  viewer: ["venture.read","venture.objectives.read","venture.validation.read","venture.resources.read","venture.team.read"],
};

const organizationRoleCapabilities: Record<string, Capability[]> = {
  admin: ALL_ORG,
  mentor: ["organization.portfolio.read","organization.members.read"],
  viewer: ["organization.portfolio.read","organization.members.read"],
};

export function capabilitiesFor(context: AccessContext): Capability[] {
  const role = context.membership.role.trim().toLowerCase();
  if (context.scope === "venture") return ventureRoleCapabilities[role] ?? [];
  if (context.scope === "organization") return organizationRoleCapabilities[role] ?? [];
  return [];
}

export function hasCapability(context: AccessContext, capability: Capability): boolean {
  return capabilitiesFor(context).includes(capability);
}
