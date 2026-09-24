import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Derecho de acceso (Ley 1581 de 2012, art. 8): la usuaria descarga todos los datos personales que la plataforma guarda sobre ella. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const limit = rateLimit(`export:${user.id}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Has descargado tus datos varias veces seguidas. Intenta más tarde.' }, { status: 429 });
    }

    const data = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        documentId: true,
        phone: true,
        avatar: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        termsAcceptedAt: true,
        termsVersion: true,
        isMinor: true,
        guardianName: true,
        guardianContact: true,
        guardianConsentAt: true,
        enrolledClasses: { select: { classSession: { select: { title: true, dateStart: true } } } },
        attendances: { select: { joinedAt: true, classSession: { select: { title: true, dateStart: true } } } },
        submissions: {
          select: {
            submittedAt: true,
            notes: true,
            fileUrl: true,
            fileType: true,
            grade: true,
            feedback: true,
            gradedAt: true,
            assignment: { select: { title: true } },
          },
        },
      },
    });

    const body = JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mis-datos-empoderas-diversas.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logError('auth/export', error);
    return NextResponse.json({ error: 'No se pudo generar la descarga.' }, { status: 500 });
  }
}
