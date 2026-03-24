type ProfileData = {
  name: string;
  age: number | null;
  trajectory: string;
  contact: string;
  position: string;
  bio: string;
  role: "admin" | "analista" | "operador";
  profileReady: boolean;
};

const profileMemory = new Map<string, ProfileData>();

export function getFallbackProfile(userId: string, seed: ProfileData) {
  const existing = profileMemory.get(userId);

  if (existing) {
    return existing;
  }

  profileMemory.set(userId, seed);
  return seed;
}

export function setFallbackProfile(userId: string, data: ProfileData) {
  profileMemory.set(userId, data);
  return data;
}
