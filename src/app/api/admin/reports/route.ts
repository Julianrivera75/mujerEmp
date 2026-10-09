import { NextResponse } from 'next/server';
import { HttpError, MAX_ROWS, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { reviewReportSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Mensajes del chat reportados, los pendientes primero. Solo la administración. */
export const GET = withAuth('admin reports GET', ['ADMIN'], async () => {
  const reports = await prisma.messageReport.findMany({
    orderBy: [{ reviewedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
    take: MAX_ROWS,
    select: {
      id: true,
      messageBody: true,
      reason: true,
      createdAt: true,
      reviewedAt: true,
      reporter: { select: { id: true, name: true } },
      reported: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ reports });
});

/** Marca un reporte como revisado. */
export const PUT = withAuth('admin reports PUT', ['ADMIN'], async (req) => {
  const { id } = await parseBody(req, reviewReportSchema);
  const result = await prisma.messageReport.updateMany({
    where: { id, reviewedAt: null },
    data: { reviewedAt: new Date() },
  });
  if (result.count === 0 && !(await prisma.messageReport.findUnique({ where: { id }, select: { id: true } }))) {
    throw new HttpError(404, 'Reporte no encontrado.');
  }
  return NextResponse.json({ success: true });
});
