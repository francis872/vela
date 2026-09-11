import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

// AI provider is configured by environment; there is no fabricated fallback.
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_DIAGNOSTIC_MODEL =
  process.env.OLLAMA_DIAGNOSTIC_MODEL || process.env.OLLAMA_MODEL || 'llama3';

export async function POST(request: NextRequest, { params }: { params: Promise<{ ventureId: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const session = auth.session;

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

    // Generate AI analysis (Ollama). If the provider is unavailable, the
    // diagnostic stays in 'submitted' — VELA never invents an analysis.
    try {
      const analysisResponse = await generateAIAnalysis(venture, data);

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

      await prisma.diagnostic.update({
        where: { id: diagnostic.id },
        data: { status: 'analyzed' },
      });

      return NextResponse.json(
        { diagnosticId: diagnostic.id, analysisStatus: 'ready' },
        { status: 201 },
      );
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      return NextResponse.json(
        { diagnosticId: diagnostic.id, analysisStatus: 'pending' },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { error: 'Error al crear diagnóstico' },
      { status: 500 }
    );
  }
}

type VentureInfo = {
  name: string;
  sector: string;
  stage: string;
};

type DiagnosticInput = {
  problem?: string;
  targetCustomers?: string;
  businessModel?: string;
  marketing?: string;
  financials?: string;
  organization?: string;
};

async function generateAIAnalysis(venture: VentureInfo, diagnosticData: DiagnosticInput) {
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

  const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_DIAGNOSTIC_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!ollamaResponse.ok) {
    throw new Error(`Ollama error: ${ollamaResponse.status}`);
  }

  const responseData = await ollamaResponse.json();
  return parseAnalysis(responseData.response);
}

function parseAnalysis(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain valid JSON');
  }
  return JSON.parse(jsonMatch[0]);
}
