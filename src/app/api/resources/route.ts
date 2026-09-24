import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RESOURCE_TYPES, YOUTUBE_HOSTS, cleanText, isOneOf, parseHttpsUrl } from '@/lib/validators';
import { keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { logError } from '@/lib/log';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo mentores o administradores pueden agregar recursos.' }, { status: 403 });
    }

    const body = await req.json();
    const { classId, title, type, url } = body;

    const cleanTitle = cleanText(title, 200);
    if (
      typeof classId !== 'string' ||
      !classId ||
      !cleanTitle ||
      !isOneOf(RESOURCE_TYPES, type) ||
      typeof url !== 'string' ||
      !url
    ) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios y deben ser válidos.' }, { status: 400 });
    }

    const classSession = await prisma.classSession.findUnique({ where: { id: classId }, select: { mentorId: true } });
    if (!classSession) {
      return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
    }
    if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
      return NextResponse.json({ error: 'No puedes agregar recursos a clases que no dictas.' }, { status: 403 });
    }

    let storedUrl: string;
    if (type === 'DOCUMENT') {
      // Archivo subido a nuestro almacenamiento: debe ser propio, existir y cumplir tipo y tamaño.
      if (!keyBelongsTo(url, 'resource', user.id) || !(await verifyUploadedObject(url, 'resource'))) {
        return NextResponse.json(
          { error: 'El archivo no es válido. Sube un PDF o una imagen de hasta 25 MB.' },
          { status: 400 },
        );
      }
      storedUrl = url;
    } else {
      const parsed = parseHttpsUrl(url, type === 'YOUTUBE' ? YOUTUBE_HOSTS : undefined);
      if (!parsed) {
        return NextResponse.json({ error: 'El enlace debe ser una URL https válida.' }, { status: 400 });
      }
      storedUrl = parsed;
    }

    const resource = await prisma.classResource.create({
      data: { classId, title: cleanTitle, type, url: storedUrl },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    logError('resources POST', error);
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
      return NextResponse.json({ error: 'No puedes eliminar recursos de clases que no dictas.' }, { status: 403 });
    }

    await prisma.classResource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('resources DELETE', error);
    return NextResponse.json({ error: 'Error al eliminar el recurso.' }, { status: 500 });
  }
}
