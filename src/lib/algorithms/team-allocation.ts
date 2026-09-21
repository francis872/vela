export type AllocationMember = {
  id: string;
  skills: string[];
  load: number;
  active: boolean;
};

export type AllocationWork = {
  id: string;
  requiredSkills: string[];
  weight: number;
};

export type AllocationRecommendation = {
  memberId: string;
  score: number;
  skillMatch: number;
  capacityFit: number;
  reasons: string[];
};

function tokens(values: string[]) {
  return new Set(values.flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/)).filter((value) => value.length > 2));
}

export function recommendAllocation(work: AllocationWork, members: AllocationMember[]): AllocationRecommendation[] {
  const required = tokens(work.requiredSkills);
  return members.filter((member) => member.active).map((member) => {
    const available = tokens(member.skills);
    const matched = [...required].filter((skill) => available.has(skill)).length;
    const skillMatch = required.size ? matched / required.size : 0.5;
    const projectedLoad = member.load + Math.max(1, work.weight);
    const capacityFit = projectedLoad >= 8 ? 0 : projectedLoad >= 5 ? 0.45 : projectedLoad >= 2 ? 0.8 : 1;
    const score = Math.round((skillMatch * 0.65 + capacityFit * 0.35) * 1000) / 10;
    const reasons = [
      required.size ? `${matched}/${required.size} required capability token(s) matched` : "no explicit skill requirement",
      `projected load ${projectedLoad}`,
    ];
    return { memberId: member.id, score, skillMatch: Math.round(skillMatch * 100), capacityFit: Math.round(capacityFit * 100), reasons };
  }).sort((a, b) => b.score - a.score);
}
