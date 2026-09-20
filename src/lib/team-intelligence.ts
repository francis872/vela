export type TeamMemberInput = {
  id: string; userId: string; name: string; role: string; responsibility: string | null;
  position: string | null; skills: string[]; status: string;
};

export type TeamIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string; explanation: string; focus: string;
  action: { label: string; href: string };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  health: { members: number; active: number; roles: number; skillCoverage: number; unassignedResponsibilities: number };
  gaps: string[];
};

const capabilityGroups = [
  { name: "product", words: ["product", "producto", "ux", "design"] },
  { name: "technology", words: ["engineering", "software", "technology", "developer", "data", "tech"] },
  { name: "market", words: ["sales", "growth", "marketing", "customer", "market"] },
  { name: "operations", words: ["operations", "operaciones", "finance", "strategy", "estrategia"] },
];

export function synthesizeTeamIntelligence(members: TeamMemberInput[]): TeamIntelligence {
  const active = members.filter((m) => m.status === "active");
  const roles = new Set(active.map((m) => m.role.toLowerCase()).filter(Boolean));
  const corpus = active.flatMap((m) => [m.role, m.position ?? "", ...m.skills]).join(" ").toLowerCase();
  const covered = capabilityGroups.filter((group) => group.words.some((word) => corpus.includes(word)));
  const gaps = capabilityGroups.filter((group) => !covered.includes(group)).map((group) => group.name);
  const unassignedResponsibilities = active.filter((m) => !m.responsibility?.trim()).length;
  const health = {
    members: members.length, active: active.length, roles: roles.size,
    skillCoverage: Math.round((covered.length / capabilityGroups.length) * 100),
    unassignedResponsibilities,
  };
  const evidence = [`members:${members.length}`, `active:${active.length}`, `roles:${roles.size}`, `capability_coverage:${health.skillCoverage}`, `responsibility_gaps:${unassignedResponsibilities}`];
  const confidence = active.length >= 4 ? "HIGH" : active.length >= 2 ? "MEDIUM" : "LOW";

  if (!members.length) return { status:"SETUP", title:"Build the venture team.", explanation:"No venture members are registered. Add the people who are actually responsible for operating this venture.", focus:"Team Setup", action:{label:"Find collaborators",href:"/network"}, confidence, evidence, health, gaps };
  if (unassignedResponsibilities > 0) return { status:"ATTENTION", title:"Team ownership is ambiguous.", explanation:`${unassignedResponsibilities} active member(s) have no documented responsibility. Assign explicit ownership before adding more coordination load.`, focus:"Ownership", action:{label:"Clarify responsibilities",href:"/team"}, confidence, evidence, health, gaps };
  if (gaps.length >= 2) return { status:"FOCUS", title:"The team has material capability gaps.", explanation:`Current profiles do not show coverage for ${gaps.join(", ")}. Treat these as visible capability gaps, not proof that the team cannot perform the work.`, focus:"Capability Coverage", action:{label:"Find missing capability",href:"/network"}, confidence, evidence, health, gaps };
  if (active.length === 1) return { status:"FOCUS", title:"The venture is operating as a single-person team.", explanation:"Ownership is clear, but execution depends on one active member. Use Network when a constraint requires capability outside the founder profile.", focus:"Concentration Risk", action:{label:"Explore collaborators",href:"/network"}, confidence, evidence, health, gaps };
  return { status:"STABLE", title:"The team has a usable operating baseline.", explanation:"Active membership, responsibility ownership and declared capability coverage do not show a dominant structural gap.", focus:"Team Health", action:{label:"Review collaboration",href:"/relay"}, confidence, evidence, health, gaps };
}
