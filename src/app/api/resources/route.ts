import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo mentores o administradores pueden agregar recursos.' }, { status: 403 });
    }

    const body = await req.json();
    const { classId, title, type, url } = body;

    if (!classId || !title || !type || !url) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    if (user.role === 'MENTOR') {
      const classSession = await prisma.classSession.findUnique({
        where: { id: classId },
        select: { mentorId: true },
      });
      if (!classSession) {
        return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
      }
      if (classSession.mentorId !== user.id) {
        return NextResponse.json({ error: 'No podés agregar recursos a clases que no dictás.' }, { status: 403 });
      }
    }

    const resource = await prisma.classResource.create({
      data: {
        classId,
        title: title.trim(),
        type,
        url,
      },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    console.error('Error al crear recurso:', error);
    return NextResponse.json({ error: 'Error al crear el recurso.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de recurso requerido.' }, { status: 400 });
    }

    const resource = await prisma.classResource.findUnique({
      where: { id },
      include: { classSession: { select: { mentorId: true } } },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Recurso no encontrado.' }, { status: 404 });
    }

    if (user.role === 'MENTOR' && resource.classSession.mentorId !== user.id) {
      return NextResponse.json({ error: 'No podés eliminar recursos de clases que no dictás.' }, { status: 403 });
    }

    await prisma.classResource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar recurso:', error);
    return NextResponse.json({ error: 'Error al eliminar el recurso.' }, { status: 500 });
  }
}
