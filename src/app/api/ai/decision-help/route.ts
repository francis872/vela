import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { chatCompletion, hasAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, context, choice, rationale } = body;
  if (!title || !context || !choice) {
    return NextResponse.json({ error: "title, context, choice required" }, { status: 400 });
  }

  if (!hasAI()) {
    return NextResponse.json({
      analysis: {
        pros: ["Decisión alineada con la dirección estratégica definida.", "Reduce incertidumbre al comprometerse con una dirección clara."],
        cons: ["Puede cerrar otras opciones antes de tener más validación.", "Requiere recursos y foco que podrían usarse en otras prioridades."],
        risks: ["Valida la decisión con al menos 2 usuarios o stakeholders antes de ejecutar.", "Define un criterio de éxito medible a 30 días para evaluar si fue la decisión correcta."],
        verdict: "Decisión razonable dado el contexto. Documenta los supuestos clave y revisa en 4 semanas.",
      },
      source: "static",
    });
  }

  const systemPrompt = `You are VelaCopilot, an AI advisor for startup founders.
Analyze the founder's decision and return a structured analysis in JSON.
Be direct, specific, and pragmatic. No generic advice.

Format:
{
  "pros": ["string", ...],
  "cons": ["string", ...],
  "risks": ["string — specific risk or recommendation", ...],
  "verdict": "1-2 sentence summary verdict"
}`;

  const userMessage = `Decision to analyze:
Title: ${title}
Context: ${context}
Choice made: ${choice}
${rationale ? `Rationale: ${rationale}` : ""}

Provide pros (2-3), cons (2-3), risks/recommendations (2), and a verdict.`;

  const reply = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    { maxTokens: 500, temperature: 0.4 }
  );

  try {
    const json = JSON.parse(reply.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""));
    return NextResponse.json({ analysis: json, source: "ai" });
  } catch {
    return NextResponse.json({
      analysis: {
        pros: ["Decisión estructurada con contexto claro."],
        cons: ["Asegúrate de validar los supuestos antes de ejecutar."],
        risks: ["Define un criterio de éxito medible a 30 días."],
        verdict: "Decisión registrada. Revisa en 4 semanas con datos reales.",
      },
      source: "static",
    });
  }
}
