import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_STATUSES, isOneOf } from '@/lib/validators';
import { logError } from '@/lib/log';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (typeof id !== 'string' || !id || !isOneOf(USER_STATUSES, status)) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    }

    if (id === currentUser.id && status === 'INACTIVO') {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { anonymizedAt: true } });
    if (!target) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }
    if (target.anonymizedAt) {
      return NextResponse.json({ error: 'Esta cuenta fue anonimizada y no puede reactivarse.' }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    logError('admin/users toggle-status', error);
    return NextResponse.json({ error: 'No se pudo actualizar el estado.' }, { status: 500 });
  }
}
