import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Comprobación de salud para el despliegue: confirma que la aplicación responde y llega a la base de datos. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logError('health', error);
    return NextResponse.json({ status: 'error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
