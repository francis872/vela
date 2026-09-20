export type VentureIntelligenceInput = {
  venture: {
    id: string;
    name: string;
    sector: string;
    stage: string;
    description: string | null;
    yearsOperating: number;
    teamSize: number;
    customers: string | null;
    monthlyRevenue: number | null;
    monthlyCosts: number | null;
  } | null;
  diagnostics: { total: number; analyzed: number; latestMaturity: number | null };
  objectives: { total: number; completed: number; blocked: number; atRisk: number };
  signals: { total: number; interviews: number; metrics: number };
  sprints: { total: number; completed: number; blocked: number };
  gates: { total: number; passed: number; pending: number };
};

export type VentureIntelligence = {
  status: "ATTENTION" | "FOCUS" | "STABLE" | "SETUP";
  title: string;
  explanation: string;
  focus: string;
  action: { label: string; href: string };
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
  operating: {
    objectiveCompletion: number | null;
    validationCoverage: number | null;
    sprintCompletion: number | null;
    gateProgress: number | null;
    operatingMargin: number | null;
  };
};

const ratio = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : null;

export function synthesizeVentureIntelligence(input: VentureIntelligenceInput): VentureIntelligence {
  const venture = input.venture;
  const objectiveCompletion = ratio(input.objectives.completed, input.objectives.total);
  const validationCoverage = input.signals.total > 0
    ? Math.round(((input.signals.interviews > 0 ? 1 : 0) + (input.signals.metrics > 0 ? 1 : 0)) / 2 * 100)
    : null;
  const sprintCompletion = ratio(input.sprints.completed, input.sprints.total);
  const gateProgress = ratio(input.gates.passed, input.gates.total);
  const revenue = venture?.monthlyRevenue ?? null;
  const costs = venture?.monthlyCosts ?? null;
  const operatingMargin = revenue !== null && costs !== null && revenue > 0
    ? Math.round(((revenue - costs) / revenue) * 100)
    : null;

  const operating = { objectiveCompletion, validationCoverage, sprintCompletion, gateProgress, operatingMargin };
  const evidence = [
    `objectives:${input.objectives.total}`,
    `blocked:${input.objectives.blocked}`,
    `signals:${input.signals.total}`,
    `sprints:${input.sprints.total}`,
    `gates:${input.gates.total}`,
    `diagnostics:${input.diagnostics.total}`,
  ];
  const evidencePoints = [
    input.objectives.total > 0,
    input.signals.total > 0,
    input.sprints.total > 0,
    input.gates.total > 0,
    input.diagnostics.analyzed > 0,
  ].filter(Boolean).length;
  const confidence = evidencePoints >= 4 ? "HIGH" : evidencePoints >= 2 ? "MEDIUM" : "LOW";

  if (!venture) {
    return { status: "SETUP", title: "Define the venture before operating it.", explanation: "VELA has no venture record for this account. Create the venture profile so every operating module can share the same business context.", focus: "Venture Setup", action: { label: "Create venture", href: "/app/ventures/new" }, confidence: "LOW", evidence, operating };
  }
  if (!venture.description || !venture.customers) {
    return { status: "FOCUS", title: "The venture context is incomplete.", explanation: "Description or customer context is missing. Complete the business identity before interpreting execution signals.", focus: "Business Context", action: { label: "Complete venture context", href: "/venture" }, confidence, evidence, operating };
  }
  if (input.objectives.blocked > 0) {
    return { status: "ATTENTION", title: "The venture is carrying blocked execution.", explanation: `${input.objectives.blocked} objective(s) are blocked. Venture should route attention to Build before adding more operating scope.`, focus: "Execution Constraint", action: { label: "Resolve blocked objectives", href: "/build" }, confidence, evidence, operating };
  }
  if (input.diagnostics.total === 0 || input.diagnostics.analyzed === 0) {
    return { status: "FOCUS", title: "The venture lacks a completed diagnostic baseline.", explanation: "The venture exists, but there is no analyzed diagnostic to anchor maturity and strategic context.", focus: "Diagnostic Baseline", action: { label: "Run venture diagnostic", href: `/app/ventures/${venture.id}/diagnostic` }, confidence, evidence, operating };
  }
  if (input.signals.interviews === 0 || input.signals.metrics === 0) {
    return { status: "FOCUS", title: "Operating activity is ahead of validation evidence.", explanation: "The venture is missing customer interviews or measurable evidence. Strengthen validation before interpreting traction as proof.", focus: "Evidence Quality", action: { label: "Strengthen validation", href: "/validate" }, confidence, evidence, operating };
  }
  if (input.sprints.total === 0) {
    return { status: "FOCUS", title: "The venture has no execution cadence.", explanation: "Evidence exists, but no Sprint is structuring the next execution cycle.", focus: "Execution Cadence", action: { label: "Create execution cadence", href: "/engine" }, confidence, evidence, operating };
  }
  if (input.gates.pending > 0) {
    return { status: "FOCUS", title: "The venture has unresolved readiness gates.", explanation: `${input.gates.pending} capital/readiness gate(s) remain pending. Resolve them with evidence before treating readiness as complete.`, focus: "Readiness", action: { label: "Review readiness gates", href: "/capital" }, confidence, evidence, operating };
  }
  return { status: "STABLE", title: "The venture operating system has a coherent baseline.", explanation: "Venture context, validation evidence and execution records are present without a dominant unresolved constraint.", focus: "Venture Health", action: { label: "Review operating pulse", href: "/vela" }, confidence, evidence, operating };
}
