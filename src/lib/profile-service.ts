import { prisma } from "@/lib/prisma";

/**
 * ProfileService — persisted professional/social profile.
 *
 * Single source of truth for the user's professional identity (headline,
 * summary, location, availability, interests, skills). Distinct from account
 * security data. Skills are structured and never auto-invented.
 */

export type ProfileInput = {
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  availability?: string | null;
  visibility?: string | null;
  interests?: string[];
};

const VISIBILITIES = new Set(["public", "connections", "private"]);
const AVAILABILITIES = new Set(["available", "open_to_collaborate", "mentoring", "busy"]);

export async function getMyProfile(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  const skills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
    orderBy: { createdAt: "asc" },
  });
  return { profile, skills };
}

export async function upsertMyProfile(userId: string, input: ProfileInput) {
  const visibility = input.visibility && VISIBILITIES.has(input.visibility) ? input.visibility : undefined;
  const availability = input.availability && AVAILABILITIES.has(input.availability) ? input.availability : undefined;

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      headline: input.headline ?? null,
      summary: input.summary ?? null,
      location: input.location ?? null,
      availability: availability ?? null,
      visibility: visibility ?? "connections",
      interests: input.interests ?? [],
    },
    update: {
      ...(input.headline !== undefined && { headline: input.headline }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.location !== undefined && { location: input.location }),
      ...(availability !== undefined && { availability }),
      ...(visibility !== undefined && { visibility }),
      ...(input.interests !== undefined && { interests: input.interests }),
    },
  });
  return profile;
}

export async function addSkill(userId: string, name: string, proficiency?: string | null) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) throw new Error("skill name required");

  const skill = await prisma.skill.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: {},
  });

  return prisma.userSkill.upsert({
    where: { userId_skillId: { userId, skillId: skill.id } },
    create: { userId, skillId: skill.id, proficiency: proficiency ?? null },
    update: { proficiency: proficiency ?? null },
    include: { skill: true },
  });
}

export async function removeSkill(userId: string, skillId: string) {
  const existing = await prisma.userSkill.findFirst({ where: { userId, skillId } });
  if (!existing) return null;
  await prisma.userSkill.delete({ where: { id: existing.id } });
  return existing;
}
