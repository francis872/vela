import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validations
    if (!data.name || !data.email || !data.ventureName) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.waitlistSignup.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 409 }
      );
    }

    // Create signup
    const signup = await prisma.waitlistSignup.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        ventureName: data.ventureName,
        sector: data.sector,
        stage: data.stage || 'validation',
        monthlyRevenue: data.monthlyRevenue ? parseFloat(data.monthlyRevenue) : null,
        mainNeed: data.mainNeed,
        interestedInBeta: data.interestedInBeta || false,
      },
    });

    return NextResponse.json({
      success: true,
      id: signup.id,
    });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: 'Error al registrarse' },
      { status: 500 }
    );
  }
}

// GET - for viewing waitlist (admin only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check for admin
    const signups = await prisma.waitlistSignup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(signups);
  } catch (error) {
    console.error('Waitlist fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener lista' },
      { status: 500 }
    );
  }
}
