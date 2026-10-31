import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { syncCertificatesAvailable } from '@/lib/notifications';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Barrido manual: avisa a todas las estudiantes de los certificados que ya están disponibles, sin
 * esperar a que cada una abra la plataforma. Útil tras cambiar un umbral o para forzar el aviso ya.
 */
export const POST = withAuth('admin/certificates/notify POST', ['ADMIN'], async () => {
  const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
  const now = new Date();
  await Promise.all(students.map((s) => syncCertificatesAvailable(s.id, now, true)));
  return NextResponse.json({ success: true, notified: students.length });
});
