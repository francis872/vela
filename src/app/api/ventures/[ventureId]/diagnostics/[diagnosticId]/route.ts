import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ventureId: string; diagnosticId: string }> }
) {
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

    const { ventureId, diagnosticId } = await params;

    // Verify ownership
    const venture = await prisma.venture.findUnique({
      where: { id: ventureId },
    });

    if (!venture || venture.userId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get diagnostic with analysis
    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id: diagnosticId },
      include: {
        analysis: true,
        venture: true,
      },
    });

    if (!diagnostic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      diagnostic,
      analysis: diagnostic.analysis,
    });
  } catch (error) {
    console.error('Analysis fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener análisis' },
      { status: 500 }
    );
  }
}
