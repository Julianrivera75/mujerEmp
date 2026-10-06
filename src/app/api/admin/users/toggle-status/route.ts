import { NextResponse } from 'next/server';
import { isStudentAccount } from '@/lib/account-types';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { enrollInUpcomingClasses } from '@/lib/enrollment';
import prisma from '@/lib/prisma';
import { toggleStatusSchema } from '@/lib/schemas';

export const POST = withAuth('admin/users toggle-status', ['ADMIN'], async (req, currentUser) => {
  const { id, status } = await parseBody(req, toggleStatusSchema);

  if (id === currentUser.id && status === 'INACTIVO') {
    throw new HttpError(400, 'No puedes desactivar tu propia cuenta.');
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { anonymizedAt: true, role: true, extraRoles: true },
  });
  if (!target) throw new HttpError(404, 'Usuario no encontrado.');
  if (target.anonymizedAt) throw new HttpError(409, 'Esta cuenta fue anonimizada y no puede reactivarse.');

  const updated = await prisma.user.update({
    where: { id },
    data: status === 'INACTIVO' ? { status, tokenVersion: { increment: 1 } } : { status },
    select: { id: true, name: true, email: true, status: true },
  });

  // Una estudiante que vuelve a estar activa recupera las clases vigentes que se programaron mientras no lo estaba.
  if (status === 'ACTIVO' && isStudentAccount(target.role, target.extraRoles)) {
    await enrollInUpcomingClasses(id).catch(() => undefined);
  }

  return NextResponse.json({ success: true, user: updated });
});
