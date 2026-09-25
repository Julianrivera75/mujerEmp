import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { toggleStatusSchema } from '@/lib/schemas';

export const POST = withAuth('admin/users toggle-status', ['ADMIN'], async (req, currentUser) => {
  const { id, status } = await parseBody(req, toggleStatusSchema);

  if (id === currentUser.id && status === 'INACTIVO') {
    throw new HttpError(400, 'No puedes desactivar tu propia cuenta.');
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { anonymizedAt: true } });
  if (!target) throw new HttpError(404, 'Usuario no encontrado.');
  if (target.anonymizedAt) throw new HttpError(409, 'Esta cuenta fue anonimizada y no puede reactivarse.');

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: { id: true, name: true, email: true, status: true },
  });

  return NextResponse.json({ success: true, user: updated });
});
