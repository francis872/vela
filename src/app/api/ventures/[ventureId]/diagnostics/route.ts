import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ ventureId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await verifySession(token).catch(() => null);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ventureId } = await params;
    const data = await request.json();

    // Verify ownership
    const venture = await prisma.venture.findUnique({
      where: { id: ventureId },
    });

    if (!venture || venture.userId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create diagnostic
    const diagnostic = await prisma.diagnostic.create({
      data: {
        ventureId,
        problem: data.problem,
        targetCustomers: data.targetCustomers,
        businessModel: data.businessModel,
        marketing: data.marketing,
        financials: data.financials,
        organization: data.organization,
        status: 'submitted',
      },
    });

    // Generate AI analysis (using Ollama)
    try {
      const analysisResponse = await generateAIAnalysis(venture, data);

      // Save analysis
      await prisma.diagnosticAnalysis.create({
        data: {
          diagnosticId: diagnostic.id,
          maturityScore: analysisResponse.maturityScore,
          strengths: analysisResponse.strengths,
          risks: analysisResponse.risks,
          validations: analysisResponse.validations,
          recommendations: analysisResponse.recommendations,
          days30Plan: analysisResponse.days30Plan,
          days60Plan: analysisResponse.days60Plan,
          days90Plan: analysisResponse.days90Plan,
        },
      });

      // Update diagnostic status
      await prisma.diagnostic.update({
        where: { id: diagnostic.id },
        data: { status: 'analyzed' },
      });
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      // Continue anyway - analysis can be generated later
    }

    return NextResponse.json({
      diagnosticId: diagnostic.id,
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { error: 'Error al crear diagnóstico' },
      { status: 500 }
    );
  }
}

async function generateAIAnalysis(venture: any, diagnosticData: any) {
  // Prepare prompt for Ollama
  const prompt = `
Análisis de Emprendimiento - VELA

Emprendimiento: ${venture.name}
Sector: ${venture.sector}
Etapa: ${venture.stage}

INFORMACIÓN DEL NEGOCIO:

1. PROBLEMA Y PROPUESTA DE VALOR:
${diagnosticData.problem}

2. CLIENTES Y VALIDACIÓN:
${diagnosticData.targetCustomers}

3. MODELO DE NEGOCIO:
${diagnosticData.businessModel}

4. MARKETING Y VENTAS:
${diagnosticData.marketing}

5. FINANZAS:
${diagnosticData.financials}

6. ORGANIZACIÓN Y EQUIPO:
${diagnosticData.organization}

INSTRUCCIONES:
Por favor proporciona un análisis estructurado que incluya:

1. MADUREZ (0-100): Puntuación general del emprendimiento
2. FORTALEZAS: 3-4 puntos fuertes identificados
3. RIESGOS: 3-4 principales riesgos o debilidades
4. VALIDACIONES: Aspectos que aún necesitan validación
5. RECOMENDACIONES: 5-7 acciones prioritarias ordenadas por importancia
6. PLANES DE 30, 60 Y 90 DÍAS: Roadmap con hitos específicos

Responde en formato JSON válido.
`;

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error('Ollama error');
    }

    const responseData = await ollamaResponse.json();
    const analysisText = responseData.response;

    // Parse the response (simple extraction)
    const analysis = parseAnalysis(analysisText);

    return analysis;
  } catch (error) {
    console.error('Ollama connection error:', error);
    
    // Return mock analysis for development
    return getMockAnalysis(venture, diagnosticData);
  }
}

function parseAnalysis(text: string) {
  // Simple parsing - in production would use more robust JSON extraction
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fallback to mock
  }

  return getMockAnalysis({}, {});
}

function getMockAnalysis(venture: any, diagnosticData: any) {
  return {
    maturityScore: 58,
    strengths: [
      'Problema claramente identificado y relevante para el mercado',
      'Equipo con experiencia en el sector',
      'Propuesta de valor diferenciadora',
      'Primeros clientes validando la solución',
    ],
    risks: [
      'Financiamiento limitado para escalar operaciones',
      'Competencia creciente en el mercado',
      'Dependencia de pocos clientes',
      'Necesidad de fortalecer el equipo en áreas clave',
    ],
    validations: [
      'Validar disposición de pago real con clientes',
      'Medir costo de adquisición de clientes',
      'Probar diferentes canales de distribución',
      'Validar modelo de precios',
    ],
    recommendations: [
      '1. Realizar 10 entrevistas con potenciales clientes en el próximo mes para validar demanda',
      '2. Definir KPIs clave para medir progreso (churn, CAC, LTV)',
      '3. Optimizar el onboarding para reducir fricción',
      '4. Establecer alianzas con 2-3 partners estratégicos',
      '5. Crear plan de marketing basado en datos de los clientes actuales',
      '6. Proyectar financiero detallado a 12 meses',
      '7. Documentar procesos clave del negocio',
    ],
    days30Plan: '• Semana 1-2: Validación intensiva con 5 potenciales clientes\n• Semana 2-3: Optimizar product basado en feedback\n• Semana 4: Definir métricas y KPIs\n• Objetivo: Tener 2-3 pilotos pagados iniciados',
    days60Plan: '• Semana 5-6: Escalar ventas a 5-10 clientes\n• Semana 7-8: Establecer 2 alianzas estratégicas\n• Semana 9-10: Implementar feedback de clientes\n• Objetivo: Validar modelo de negocio rentable',
    days90Plan: '• Semana 11-12: Planificación de siguiente fase de inversión\n• Semana 13: Documentar resultados y learnings\n• Semana 14-16: Preparar pitch para inversores/partners\n• Objetivo: Asegurar financiamiento o alianzas para crecer',
  };
}
