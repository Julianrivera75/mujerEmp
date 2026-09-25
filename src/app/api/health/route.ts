import { NextResponse } from 'next/server';
import { logError } from '@/lib/log';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Comprobación de salud para el despliegue: confirma que la aplicación responde y llega a la base de datos. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' }, { headers: NO_STORE });
  } catch (error) {
    logError('health', error);
    return NextResponse.json({ status: 'error' }, { status: 503, headers: NO_STORE });
  }
}
