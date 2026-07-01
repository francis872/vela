import type { SessionRole } from "@/lib/auth";

type ProfileState = {
  name: string;
  age: number | null;
  trajectory: string;
  contact: string;
  position: string;
  bio: string;
  role: SessionRole;
  profileReady: boolean;
};

const memoryProfileStore = new Map<string, ProfileState>();

export function getFallbackProfile(userId: string, fallback: ProfileState) {
  const existing = memoryProfileStore.get(userId);
  if (existing) {
    return existing;
  }

  memoryProfileStore.set(userId, fallback);
  return fallback;
}

export function setFallbackProfile(userId: string, profile: ProfileState) {
  memoryProfileStore.set(userId, profile);
  return profile;
}