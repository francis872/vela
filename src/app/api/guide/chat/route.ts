import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { chatCompletionStream, hasAI } from "@/lib/ai";

const STREAM_HEADERS = { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } as const;

function textStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({ start(ctrl) { ctrl.enqueue(encoder.encode(text)); ctrl.close(); } });
}

const VELA_SYSTEM_PROMPT = `Eres **Vela Guide**, el agente de inteligencia artificial oficial de la plataforma VELA.
Tu rol es ser el guía experto que explica qué es VELA, para qué sirve, cuáles son sus objetivos y cuál es su misión.
Respondes siempre en español, con tono claro, profesional y cercano — como un co-founder experimentado que acompaña al usuario.

## ¿Qué es VELA?
VELA es un **Sistema Operativo para Startups** — una plataforma de ejecución diseñada para que fundadores y equipos construyan, validen y escalen sus empresas con estructura, claridad y velocidad.
No es un CRM, no es una herramienta de gestión de proyectos genérica. Es un OS que integra el ciclo completo de venture building: desde definir objetivos hasta cerrar rondas de financiamiento.

## Misión
Hacer que construir una startup sea un proceso estructurado, medible y reproducible — sin perder la velocidad y el instinto del emprendimiento.

## Visión
Un ecosistema donde cada startup tiene las herramientas, la red y la metodología para ejecutar al nivel de las mejores del mundo — sin importar desde dónde comienza.

## Los 5 módulos del OS
1. **Command** — El centro de operaciones. Vista unificada de objetivos activos, señales recientes, readiness de capital y comunicación del equipo. Punto de partida de cada día.
2. **Build** — Gestión de objetivos por ciclos. Tablero Kanban con estados on_track / at_risk / blocked / completed. Define qué construyes y cuándo.
3. **Validate** — Registro de señales de mercado. Captura experimentos, entrevistas, métricas e insights. La evidencia que sustenta cada decisión.
4. **Capital** — Readiness gates de financiamiento. Seguimiento de criterios por etapa (Discovery → Validation → Traction → Scale → Series A). Sabes exactamente qué te falta para levantar capital.
5. **Relay** — Comunicación del equipo. Threads por categoría: Updates, Blockers, Decisiones, Victorias. Coordinación asincrónica con contexto.

## Módulos adicionales
- **Space** — Biblioteca de recursos, frameworks y playbooks para ejecutar: Lean Canvas, sprint de validación, OKR Starter Kit, modelos financieros.
- **Inspire** — Historias de founders del ecosistema VELA que alcanzaron hitos reales. Reflexiones diarias y estadísticas del ecosistema.
- **Velaseed** — Herramienta de evaluación de startups con scoring IEV (Índice de Escalabilidad y Viabilidad). Para mentores e inversores.
- **Dashboard** — Tablero de portfolio para el equipo VELA. Métricas agregadas de todas las startups evaluadas.

## Valores fundamentales
- **Ejecución sobre perfección** — Una hipótesis validada vale más que mil slides.
- **Claridad en menos de 5 segundos** — Cada pantalla debe comunicar su propósito al instante.
- **Datos > intuición** — Las decisiones se basan en señales reales, no en suposiciones.
- **Estructura que libera** — El proceso no es un límite, es la base desde la que se innova.

## A quién sirve VELA
- **Founders / CEOs**: Para operar con claridad, trackear objetivos y preparar el capital raise.
- **Analistas / Mentores**: Para evaluar startups, registrar señales y dar seguimiento a portafolios.
- **Operadores / Equipo**: Para ejecutar tareas, registrar avances y comunicarse con estructura.

## Reglas de respuesta
- Responde siempre en español.
- Sé conciso pero completo. Si la pregunta es amplia, estructura la respuesta con bullets o secciones breves.
- Si te preguntan algo fuera del alcance de VELA (ej. código de otra plataforma, temas personales), indica amablemente que tu especialidad es VELA y ofrece reconducir la conversación.
- No inventes funcionalidades que no existen. Si no sabes algo específico, dilo con transparencia.
- Usa el tono de un co-founder experto: directo, sin jerga innecesaria, con criterio.`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  // Fallback: no AI provider → stream curated response
  if (!hasAI()) {
    const last = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
    let reply = "Soy Vela Guide, el asistente de VELA OS. Puedo explicarte qué es VELA, sus módulos, misión y cómo usarlo. ¿En qué te puedo ayudar?";
    if (last.includes("qué es") || last.includes("que es") || last.includes("vela"))
      reply = "**VELA** es un Sistema Operativo para Startups — integra **Command**, **Build**, **Validate**, **Capital** y **Relay** en un ciclo completo de venture building.";
    else if (last.includes("misión") || last.includes("mision") || last.includes("visión") || last.includes("vision"))
      reply = "**Misión:** Hacer que construir una startup sea estructurado, medible y reproducible.\n\n**Visión:** Un ecosistema donde cada startup ejecuta al nivel de las mejores del mundo.";
    else if (last.includes("módulo") || last.includes("modulo") || last.includes("área") || last.includes("area"))
      reply = "Los 5 módulos core de VELA:\n1. **Command** — Centro de operaciones diario\n2. **Build** — Objetivos en ciclos (Kanban)\n3. **Validate** — Señales de mercado\n4. **Capital** — Gates de financiamiento\n5. **Relay** — Comunicación del equipo";
    else if (last.includes("capital") || last.includes("inversión") || last.includes("fundraising"))
      reply = "**Capital** trackea tu readiness por etapa: Discovery → Validation → Traction → Scale → Series A. Cada gate tiene criterios específicos.";
    else if (last.includes("build") || last.includes("objetivo") || last.includes("okr"))
      reply = "**Build** gestiona objetivos con Kanban: on_track / at_risk / blocked / completed. Define prioridad, fecha límite y ciclo.";
    else if (last.includes("validate") || last.includes("señal") || last.includes("experimento"))
      reply = "**Validate** registra señales en 4 tipos: Experimento, Entrevista, Métrica e Insight. Cada señal captura hipótesis, resultado y aprendizaje.";
    return new Response(textStream(reply), { headers: STREAM_HEADERS });
  }

  const stream = await chatCompletionStream(
    [
      { role: "system", content: VELA_SYSTEM_PROMPT },
      ...messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    { maxTokens: 600, temperature: 0.7 }
  );

  return new Response(stream, { headers: STREAM_HEADERS });
}
