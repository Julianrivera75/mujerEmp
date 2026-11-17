import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { certificateOverrideSchema, revokeCertificateOverrideSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Autorizaciones y bloqueos manuales activos (no revocados), para la tabla de auditoría del admin. */
export const GET = withAuth('admin/certificates/overrides GET', ['ADMIN'], async () => {
  const overrides = await prisma.certificateOverride.findMany({
    where: { revokedAt: null },
    select: {
      id: true,
      studentId: true,
      moduleNumber: true,
      action: true,
      reason: true,
      createdAt: true,
      student: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    overrides: overrides.map((o) => ({
      id: o.id,
      studentId: o.studentId,
      studentName: o.student.name,
      studentEmail: o.student.email,
      moduleNumber: o.moduleNumber,
      action: o.action,
      reason: o.reason,
      createdByName: o.createdBy.name,
      createdAt: o.createdAt,
    })),
  });
});

/**
 * Autoriza o bloquea el certificado de un módulo a una o varias estudiantes a la vez. Si ya había una
 * override activa para alguna de ellas en ese módulo, se revoca antes de crear la nueva (no se pisa).
 */
export const POST = withAuth('admin/certificates/overrides POST', ['ADMIN'], async (req, user) => {
  const { studentIds, moduleNumber, action, reason } = await parseBody(req, certificateOverrideSchema);

  const students = await prisma.user.findMany({
    where: { id: { in: studentIds }, OR: [{ role: 'STUDENT' }, { extraRoles: { has: 'STUDENT' } }] },
    select: { id: true },
  });
  if (students.length !== studentIds.length) throw new HttpError(400, 'Alguna estudiante seleccionada no existe.');

  const now = new Date();
  await prisma.$transaction([
    prisma.certificateOverride.updateMany({
      where: { studentId: { in: studentIds }, moduleNumber, revokedAt: null },
      data: { revokedAt: now, revokedById: user.id, revokedReason: 'Reemplazada por una nueva autorización/bloqueo.' },
    }),
    prisma.certificateOverride.createMany({
      data: studentIds.map((studentId) => ({
        studentId,
        moduleNumber,
        action,
        reason,
        createdById: user.id,
      })),
    }),
  ]);

  return NextResponse.json({ success: true, count: studentIds.length });
});

/** Revierte una autorización/bloqueo: vuelve a aplicar la regla normal del módulo para esa estudiante. */
export const DELETE = withAuth('admin/certificates/overrides DELETE', ['ADMIN'], async (req, user) => {
  const { id, revokedReason } = await parseBody(req, revokeCertificateOverrideSchema);

  const existing = await prisma.certificateOverride.findUnique({ where: { id }, select: { revokedAt: true } });
  if (!existing) throw new HttpError(404, 'No se encontró esa autorización/bloqueo.');
  if (existing.revokedAt) throw new HttpError(400, 'Ya estaba revertida.');

  await prisma.certificateOverride.update({
    where: { id },
    data: { revokedAt: new Date(), revokedById: user.id, revokedReason },
  });

  return NextResponse.json({ success: true });
});
