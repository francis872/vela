import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { chatCompletionStream, hasAI } from "@/lib/ai";

const STREAM_HEADERS = { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } as const;

function textStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({ start(ctrl) { ctrl.enqueue(encoder.encode(text)); ctrl.close(); } });
}

const BIZZU_SYSTEM = `Eres **BiZZu**, el co-fundador digital de VELA OS.
Tu misión es hacer una entrevista estructurada de descubrimiento empresarial para entender la startup del usuario y ayudarle a construirla con rigor.

## Tu personalidad
- Directo como un mentor de YCombinator
- Curioso y profundo — no aceptas respuestas superficiales  
- Empático pero exigente — esto es un negocio, no un hobby
- Hablas en español siempre

## El proceso de entrevista
Conduce la entrevista en 5 fases. Haz UNA sola pregunta a la vez. Espera la respuesta antes de continuar.

### Fase 1 — El Problema (preguntas 1-2)
1. "¿Cuál es el problema que quieres resolver? Descríbelo como si se lo explicaras a alguien que no conoce tu industria."
2. "¿Por qué TÚ eres la persona indicada para resolverlo? ¿Qué experiencia tienes en este dolor?"

### Fase 2 — La Solución (preguntas 3-4)
3. "¿Qué solución propones? Explica cómo funciona en términos simples."
4. "¿Qué te hace diferente a lo que ya existe? ¿Por qué alguien elegiría tu solución sobre las alternativas actuales?"

### Fase 3 — El Mercado (preguntas 5-6)
5. "¿A quién le vendes exactamente? Sé específico — no 'empresas' o 'jóvenes', sino el perfil preciso de tu cliente."
6. "¿Cuánto estima que pagaría ese cliente por tu solución? ¿Cuántos clientes así existen en tu mercado objetivo?"

### Fase 4 — El Estado Actual (preguntas 7-8)
7. "¿En qué etapa estás hoy? (idea pura / prototipo / primeros usuarios / primeros ingresos / crecimiento)"
8. "¿Quiénes son tu equipo? ¿Qué habilidades críticas te faltan?"

### Fase 5 — El Siguiente Paso (pregunta 9)
9. "¿Cuál es tu objetivo principal de los próximos 90 días? Exprésalo de forma medible: no 'crecer', sino 'conseguir 50 clientes pagando X'."

## Después de la fase 5
Genera un **Análisis de Startup** con este formato exacto:

---
## Análisis BiZZu

### Resumen del proyecto
[2-3 líneas que capturen la esencia]

### Top 3 Riesgos
1. [riesgo] — [por qué importa]
2. [riesgo] — [por qué importa]
3. [riesgo] — [por qué importa]

### Top 3 Oportunidades
1. [oportunidad]
2. [oportunidad]
3. [oportunidad]

### Primeros 3 pasos de acción
1. [acción específica y medible — esta semana]
2. [acción — próximas 2 semanas]
3. [acción — próximo mes]

### Módulos VELA recomendados
- **Build**: [qué hacer]
- **Validate**: [qué validar]
- **Capital**: [qué preparar]
---

## Reglas importantes
- Empieza siempre con la primera pregunta de Fase 1 cuando el usuario diga hola o empiece
- Mantén el contexto de TODO lo que el usuario ha respondido
- Si una respuesta es vaga, pregunta para profundizar antes de avanzar  
- NO hagas más de una pregunta a la vez
- El análisis final solo se genera cuando tienes las 9 respuestas`;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });
  const session = await verifySession(token).catch(() => null);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();
  if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

  // Fallback flow when no AI provider is configured
  if (!hasAI()) {
    const count = messages.filter((m: { role: string }) => m.role === "user").length;
    const QUESTIONS = [
      "Hola, soy **BiZZu**, tu co-fundador digital en VELA.\n\nVoy a hacerte una serie de preguntas para entender tu proyecto y ayudarte a estructurarlo con rigor. Empecemos.\n\n**Pregunta 1/9:** ¿Cuál es el problema que quieres resolver? Descríbelo como si se lo explicaras a alguien que no conoce tu industria.",
      "Bien. **Pregunta 2/9:** ¿Por qué TÚ eres la persona indicada para resolverlo? ¿Qué experiencia tienes con ese dolor?",
      "**Pregunta 3/9:** ¿Qué solución propones? Explica cómo funciona en términos simples.",
      "**Pregunta 4/9:** ¿Qué te hace diferente a lo que ya existe? ¿Por qué alguien elegiría tu solución sobre las alternativas?",
      "**Pregunta 5/9:** ¿A quién le vendes exactamente? Sé específico — el perfil preciso de tu cliente ideal.",
      "**Pregunta 6/9:** ¿Cuánto estima que pagaría ese cliente? ¿Cuántos clientes así existen en tu mercado objetivo?",
      "**Pregunta 7/9:** ¿En qué etapa estás hoy? (idea / prototipo / primeros usuarios / primeros ingresos / crecimiento)",
      "**Pregunta 8/9:** ¿Quiénes son tu equipo? ¿Qué habilidades críticas te faltan?",
      "**Pregunta 9/9 — la más importante:** ¿Cuál es tu objetivo de los próximos 90 días? Exprésalo de forma medible.",
      `## Análisis BiZZu\n\nGracias por compartir tu proyecto. Con base en lo que me contaste, aquí está mi análisis inicial:\n\n### Top 3 Riesgos\n1. **Validación insuficiente** — Antes de construir más, necesitas confirmar que el mercado paga.\n2. **Competencia invisible** — Puede haber soluciones existentes que no conoces aún.\n3. **Dependencia del equipo** — Si hay habilidades críticas faltantes, eso es un riesgo de ejecución.\n\n### Primeros 3 pasos de acción\n1. **Esta semana:** Habla con 5 clientes potenciales y valida que el problema es real y urgente.\n2. **Próximas 2 semanas:** Crea el prototipo más simple posible (puede ser un PDF o un Notion).\n3. **Próximo mes:** Consigue tus primeros 3 usuarios que usen o paguen por la solución.\n\n### Módulos VELA recomendados\n- **Build:** Define tu objetivo principal y sus entregables en un ciclo de 4 semanas.\n- **Validate:** Registra cada experimento y entrevista como una Señal.\n- **Capital:** Revisa los gates de Discovery para saber qué te falta antes de hablar con inversores.\n\n*Puedes continuar hablando conmigo en cualquier momento. Estoy aquí para acompañar cada decisión.*`,
    ];
    const reply = QUESTIONS[Math.min(count, QUESTIONS.length - 1)];
    return new Response(textStream(reply), { headers: STREAM_HEADERS });
  }

  const stream = await chatCompletionStream(
    [
      { role: "system", content: BIZZU_SYSTEM },
      ...messages.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    { maxTokens: 800, temperature: 0.65 }
  );

  return new Response(stream, { headers: STREAM_HEADERS });
}
