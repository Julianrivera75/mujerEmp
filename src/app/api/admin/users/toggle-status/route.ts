import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Datos insuficientes.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el estado.' }, { status: 500 });
  }
}
