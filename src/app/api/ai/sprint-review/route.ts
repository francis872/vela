import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, hasAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sprintId } = body;
  if (!sprintId) return NextResponse.json({ error: "sprintId required" }, { status: 400 });

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { items: true },
  });

  if (!sprint || sprint.ownerId !== session.sub) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }

  const done   = sprint.items.filter((i) => i.done);
  const undone = sprint.items.filter((i) => !i.done);
  const doneRate = Math.round((done.length / Math.max(sprint.items.length, 1)) * 100);

  if (!hasAI()) {
    const review = buildStaticReview({ sprint, done, undone, doneRate });
    return NextResponse.json({ review, source: "static" });
  }

  const systemPrompt = `You are VelaCopilot, a startup sprint coach.
Analyze this sprint and return a structured review in JSON. Be direct and specific.

Format:
{
  "summary": "2-3 sentence overview of the sprint",
  "wins": ["string", ...],
  "blockers": ["string", ...],
  "nextWeek": ["string — specific recommendation", ...]
}`;

  const userMessage = `Sprint: "${sprint.title}"
Period: ${sprint.weekStart.toISOString().slice(0, 10)} → ${sprint.weekEnd.toISOString().slice(0, 10)}
Completion: ${doneRate}% (${done.length}/${sprint.items.length} tasks)

Completed tasks:
${done.map((i) => `- ${i.title}`).join("\n") || "None"}

Incomplete tasks:
${undone.map((i) => `- ${i.title}`).join("\n") || "None"}

Provide: summary, wins (2-3), blockers (1-2), nextWeek recommendations (2-3).`;

  const reply = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    { maxTokens: 500, temperature: 0.4 }
  );

  try {
    const json = JSON.parse(reply.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""));
    return NextResponse.json({ review: json, source: "ai" });
  } catch {
    const review = buildStaticReview({ sprint, done, undone, doneRate });
    return NextResponse.json({ review, source: "static" });
  }
}

function buildStaticReview({
  sprint, done, undone, doneRate,
}: {
  sprint: { title: string };
  done: { title: string }[];
  undone: { title: string }[];
  doneRate: number;
}) {
  const wins = done.slice(0, 3).map((i) => `Completado: "${i.title}"`);
  const blockers = undone.slice(0, 2).map((i) => `Pendiente: "${i.title}" — analiza si sigue siendo prioridad`);

  return {
    summary: `Sprint "${sprint.title}" cerrado con ${doneRate}% de completitud. ${
      doneRate >= 80
        ? "Excelente ejecución esta semana."
        : doneRate >= 50
        ? "Progreso sólido, pero hay espacio para mejorar el enfoque."
        : "Semana con fricciones. Considera reducir el scope del próximo sprint."
    }`,
    wins: wins.length > 0 ? wins : ["Sprint ejecutado — cada semana completada es progreso."],
    blockers: blockers.length > 0 ? blockers : ["Sin bloqueos identificados."],
    nextWeek: [
      doneRate < 80 ? "Reduce los compromisos del próximo sprint a lo verdaderamente crítico." : "Mantén el ritmo y añade una tarea de validación con usuarios.",
      "Documenta los aprendizajes del sprint en el Decision Log antes de arrancar el siguiente.",
    ],
  };
}
