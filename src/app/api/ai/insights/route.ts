import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, hasAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = session.sub;

  // Fetch founder data in parallel
  const [objectives, signals, gates, score, sprints, decisions] = await Promise.all([
    prisma.objective.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.signal.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.gate.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.founderScore.findUnique({ where: { ownerId } }),
    prisma.sprint.findMany({ where: { ownerId }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.decision.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  // Build context snapshot
  const blockedObj = objectives.filter((o) => o.status === "blocked");
  const atRiskObj  = objectives.filter((o) => o.status === "at_risk");
  const failedGates = gates.filter((g) => g.status === "failed");
  const lastSprint = sprints[0];
  const sprintDoneRate = lastSprint
    ? Math.round((lastSprint.items.filter((i) => i.done).length / Math.max(lastSprint.items.length, 1)) * 100)
    : null;

  const totalScore = (score?.execution ?? 0) + (score?.results ?? 0) + (score?.collaboration ?? 0);

  const context = `
Founder: ${session.name}
FounderScore: execution=${score?.execution ?? 0}, results=${score?.results ?? 0}, collaboration=${score?.collaboration ?? 0}, total=${totalScore}
Objectives (${objectives.length}): ${objectives.map((o) => `"${o.title}" [${o.status}]`).join("; ")}
Blocked objectives: ${blockedObj.length} — ${blockedObj.map((o) => o.title).join(", ") || "none"}
At-risk objectives: ${atRiskObj.length} — ${atRiskObj.map((o) => o.title).join(", ") || "none"}
Recent signals (${signals.length}): ${signals.map((s) => `${s.type}: "${s.title}"`).join("; ")}
Gates: ${gates.map((g) => `"${g.name}" [${g.status}]`).join("; ")}
Failed gates: ${failedGates.map((g) => g.name).join(", ") || "none"}
Last sprint: ${lastSprint ? `"${lastSprint.title}" — ${sprintDoneRate}% done` : "none"}
Recent decisions: ${decisions.map((d) => `"${d.title}"`).join("; ") || "none"}
`.trim();

  // Static fallback insights when no AI configured
  if (!hasAI()) {
    const insights = buildStaticInsights({ blockedObj, atRiskObj, failedGates, sprintDoneRate, totalScore, signals });
    return NextResponse.json({ insights, source: "static" });
  }

  const systemPrompt = `You are VelaCopilot, an AI advisor embedded in Vela — a startup operating system.
Your job: analyze the founder's data snapshot and return exactly 3 actionable insights.
Rules:
- Each insight must be concrete and specific to the data provided
- Tone: direct, no fluff, like a seasoned startup coach
- Focus on what matters most RIGHT NOW
- Return JSON only, no explanation outside the JSON

Format:
{
  "insights": [
    { "type": "warning"|"success"|"action", "title": "short title", "body": "2-3 sentence insight" },
    ...
  ]
}`;

  const reply = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is my startup data:\n\n${context}\n\nGive me 3 insights.` },
    ],
    { maxTokens: 600, temperature: 0.4 }
  );

  try {
    const json = JSON.parse(reply.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""));
    return NextResponse.json({ insights: json.insights, source: "ai" });
  } catch {
    // AI responded but not valid JSON — fall back to static
    const insights = buildStaticInsights({ blockedObj, atRiskObj, failedGates, sprintDoneRate, totalScore, signals });
    return NextResponse.json({ insights, source: "static" });
  }
}

function buildStaticInsights({
  blockedObj, atRiskObj, failedGates, sprintDoneRate, totalScore, signals,
}: {
  blockedObj: { title: string }[];
  atRiskObj:  { title: string }[];
  failedGates: { name: string }[];
  sprintDoneRate: number | null;
  totalScore: number;
  signals: { type: string }[];
}) {
  const insights: { type: string; title: string; body: string }[] = [];

  if (blockedObj.length > 0) {
    insights.push({
      type: "warning",
      title: `${blockedObj.length} objetivo${blockedObj.length > 1 ? "s" : ""} bloqueado${blockedObj.length > 1 ? "s" : ""}`,
      body: `"${blockedObj[0].title}" está bloqueado. Identifica el obstáculo principal y agenda una sesión de debloqueo esta semana.`,
    });
  } else if (atRiskObj.length > 0) {
    insights.push({
      type: "warning",
      title: `${atRiskObj.length} objetivo en riesgo`,
      body: `"${atRiskObj[0].title}" está en riesgo. Revisa si faltan recursos o si el scope es demasiado ambicioso para el plazo.`,
    });
  } else {
    insights.push({
      type: "success",
      title: "Objetivos en buen estado",
      body: "No tienes objetivos bloqueados ni en riesgo. Mantén el ritmo y asegúrate de capturar señales de validación regularmente.",
    });
  }

  if (failedGates.length > 0) {
    insights.push({
      type: "warning",
      title: "Gate fallido requiere atención",
      body: `El gate "${failedGates[0].name}" falló. Analiza qué criterio no se cumplió y define un plan de remediación antes de continuar.`,
    });
  } else if (sprintDoneRate !== null && sprintDoneRate < 60) {
    insights.push({
      type: "action",
      title: `Sprint al ${sprintDoneRate}% — ritmo bajo`,
      body: "Menos del 60% de tus compromisos completados en el último sprint. Reduce el scope o elimina distracciones esta semana.",
    });
  } else {
    insights.push({
      type: "action",
      title: "Captura más señales de mercado",
      body: `Tienes ${signals.length} señales registradas. Apunta a 2+ entrevistas con usuarios esta semana para fortalecer tu validación.`,
    });
  }

  if (totalScore < 50) {
    insights.push({
      type: "action",
      title: "Construye tu FounderScore",
      body: "Tu score está en fase Early Builder. Completa sprints, registra decisiones y genera señales para subir de nivel.",
    });
  } else if (totalScore >= 300) {
    insights.push({
      type: "success",
      title: "Nivel Founder Elite",
      body: "Estás en el nivel más alto de ejecución en Vela. Considera mentorear a otros founders del ecosistema.",
    });
  } else {
    insights.push({
      type: "success",
      title: "Progreso sólido",
      body: `Score total: ${totalScore}. Mantén la cadencia de sprints y decisiones documentadas para seguir subiendo de nivel.`,
    });
  }

  return insights;
}
