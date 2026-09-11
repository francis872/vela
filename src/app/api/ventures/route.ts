import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const data = await request.json();

    // Check if user already has a venture
    const existing = await prisma.venture.findUnique({
      where: { userId: session.sub },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya tienes un emprendimiento registrado' },
        { status: 400 }
      );
    }

    // Create venture
    const venture = await prisma.venture.create({
      data: {
        userId: session.sub,
        name: data.name,
        sector: data.sector,
        stage: data.stage || 'validation',
        description: data.description,
        yearsOperating: data.yearsOperating || 0,
        teamSize: data.teamSize || 1,
        customers: data.customers,
        monthlyRevenue: data.monthlyRevenue || 0,
        monthlyCosts: data.monthlyCosts || 0,
      },
    });

    return NextResponse.json({
      ventureId: venture.id,
    });
  } catch (error) {
    console.error('Venture creation error:', error);
    return NextResponse.json(
      { error: 'Error al crear emprendimiento' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const session = auth.session;

    const venture = await prisma.venture.findUnique({
      where: { userId: session.sub },
      include: {
        diagnostics: {
          include: { analysis: true },
        },
      },
    });

    return NextResponse.json(venture);
  } catch (error) {
    console.error('Venture fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener emprendimiento' },
      { status: 500 }
    );
  }
}
