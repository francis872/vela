export type EcosystemNavLink = {
  label: string;
  href: string;
  subtitle: string;
};

export type HumanTalk = {
  title: string;
  speaker: string;
  length: string;
  topic: string;
};

export type HumanPath = {
  stage: string;
  focus: string;
  rhythm: string;
};

export type SpaceTemplate = {
  name: string;
  stack: string;
  status: "active" | "draft";
  owner: string;
};

export type AdventureThesis = {
  title: string;
  horizon: string;
  conviction: string;
  riskBand: "high" | "medium" | "controlled";
};

export const ecosystemNavLinks: EcosystemNavLink[] = [
  {
    label: "Human",
    href: "/access/insights",
    subtitle: "Talks + rutas",
  },
  {
    label: "Relay",
    href: "/access",
    subtitle: "Feed profesional",
  },
  {
    label: "Space",
    href: "/access/builder-lab/mvp-board",
    subtitle: "Repositorio de startups",
  },
  {
    label: "Vela Adventure",
    href: "/access/capital-ops",
    subtitle: "Capital y riesgo",
  },
];

export const humanFeaturedTalks: HumanTalk[] = [
  {
    title: "Diseñar cultura en startups que escalan",
    speaker: "Marina Rojas",
    length: "14 min",
    topic: "Culture",
  },
  {
    title: "Cómo decidir con evidencia y no con ansiedad",
    speaker: "Diego Navarro",
    length: "11 min",
    topic: "Decision-Making",
  },
  {
    title: "Narrativa de producto para mercados competitivos",
    speaker: "Sara Caballero",
    length: "9 min",
    topic: "Product Story",
  },
];

export const humanLearningPaths: HumanPath[] = [
  {
    stage: "Idea to MVP",
    focus: "Problema, usuario y propuesta de valor",
    rhythm: "4 sesiones/semana",
  },
  {
    stage: "MVP to Traction",
    focus: "Adquisicion, activacion y retencion",
    rhythm: "5 sesiones/semana",
  },
  {
    stage: "Traction to Scale",
    focus: "Sistemas de liderazgo y expansion",
    rhythm: "3 sesiones/semana",
  },
];

export const spaceRepoTemplates: SpaceTemplate[] = [
  {
    name: "startup-core-os",
    stack: "Next.js + Prisma",
    status: "active",
    owner: "Builder Team",
  },
  {
    name: "growth-playbook-latam",
    stack: "Docs + Metrics",
    status: "active",
    owner: "Growth Squad",
  },
  {
    name: "venture-risk-simulator",
    stack: "Python + SQL",
    status: "draft",
    owner: "Capital Ops",
  },
];

export const adventureTheses: AdventureThesis[] = [
  {
    title: "Vertical SaaS para operaciones B2B en Latam",
    horizon: "24 meses",
    conviction: "Alta",
    riskBand: "medium",
  },
  {
    title: "Fintech de infraestructura para pymes exportadoras",
    horizon: "18 meses",
    conviction: "Media",
    riskBand: "high",
  },
  {
    title: "AI aplicada a productividad de equipos tecnicos",
    horizon: "30 meses",
    conviction: "Alta",
    riskBand: "controlled",
  },
];
