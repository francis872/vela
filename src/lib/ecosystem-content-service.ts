import { prisma } from "@/lib/prisma";
import {
  adventureTheses,
  humanFeaturedTalks,
  humanLearningPaths,
  spaceRepoTemplates,
} from "@/lib/ecosystem-seed";

export type EcosystemModule = "human" | "space" | "adventure";

export type EcosystemContentItem = {
  id: string;
  module: string;
  category: string;
  title: string;
  summary: string;
  detail: string | null;
  meta: string | null;
  tags: string[];
  sortOrder: number;
  seedKey: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SeedContentInput = {
  module: EcosystemModule;
  category: string;
  title: string;
  summary: string;
  detail?: string;
  meta?: string;
  tags?: string[];
  sortOrder: number;
  seedKey: string;
};

function buildSeedContent(): SeedContentInput[] {
  const humanTalkSeeds: SeedContentInput[] = humanFeaturedTalks.map((talk, index) => ({
    module: "human",
    category: "talk",
    title: talk.title,
    summary: `${talk.speaker} · ${talk.topic}`,
    detail: talk.length,
    meta: talk.topic,
    tags: ["human", "talk"],
    sortOrder: index,
    seedKey: `human-talk-${index + 1}`,
  }));

  const humanPathSeeds: SeedContentInput[] = humanLearningPaths.map((path, index) => ({
    module: "human",
    category: "path",
    title: path.stage,
    summary: path.focus,
    detail: path.rhythm,
    meta: "learning-path",
    tags: ["human", "path"],
    sortOrder: index,
    seedKey: `human-path-${index + 1}`,
  }));

  const spaceSeed: SeedContentInput[] = spaceRepoTemplates.map((repo, index) => ({
    module: "space",
    category: "repo-template",
    title: repo.name,
    summary: `${repo.stack} · ${repo.owner}`,
    detail: repo.status,
    meta: repo.status,
    tags: ["space", "repo"],
    sortOrder: index,
    seedKey: `space-repo-${index + 1}`,
  }));

  const adventureSeed: SeedContentInput[] = adventureTheses.map((thesis, index) => ({
    module: "adventure",
    category: "thesis",
    title: thesis.title,
    summary: `Horizonte ${thesis.horizon} · Conviccion ${thesis.conviction}`,
    detail: `Riesgo ${thesis.riskBand}`,
    meta: thesis.riskBand,
    tags: ["adventure", "thesis"],
    sortOrder: index,
    seedKey: `adventure-thesis-${index + 1}`,
  }));

  return [...humanTalkSeeds, ...humanPathSeeds, ...spaceSeed, ...adventureSeed];
}

export async function ensureEcosystemSeedContent() {
  const seeds = buildSeedContent();

  await prisma.$transaction(
    seeds.map((seed) =>
      prisma.ecosystemContent.upsert({
        where: { seedKey: seed.seedKey },
        update: {
          module: seed.module,
          category: seed.category,
          title: seed.title,
          summary: seed.summary,
          detail: seed.detail,
          meta: seed.meta,
          tags: seed.tags ?? [],
          sortOrder: seed.sortOrder,
        },
        create: {
          module: seed.module,
          category: seed.category,
          title: seed.title,
          summary: seed.summary,
          detail: seed.detail,
          meta: seed.meta,
          tags: seed.tags ?? [],
          sortOrder: seed.sortOrder,
          seedKey: seed.seedKey,
          createdByName: "seed-system",
        },
      }),
    ),
  );
}

export async function listEcosystemContent(module?: EcosystemModule) {
  const where = module ? { module } : undefined;

  return prisma.ecosystemContent.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
