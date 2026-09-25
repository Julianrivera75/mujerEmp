import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { createResourceSchema } from '@/lib/schemas';
import { YOUTUBE_HOSTS, parseHttpsUrl } from '@/lib/validators';

export const POST = withAuth('resources POST', ['MENTOR', 'ADMIN'], async (req, user) => {
  const { classId, title, type, url } = await parseBody(req, createResourceSchema);

  const classSession = await prisma.classSession.findUnique({ where: { id: classId }, select: { mentorId: true } });
  if (!classSession) throw new HttpError(404, 'Clase no encontrada.');
  if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No puedes agregar recursos a clases que no dictas.');
  }

  let storedUrl: string;
  if (type === 'DOCUMENT') {
    // Archivo subido a nuestro almacenamiento: debe ser propio, existir y cumplir tipo y tamaño.
    if (!keyBelongsTo(url, 'resource', user.id) || !(await verifyUploadedObject(url, 'resource'))) {
      throw new HttpError(400, 'El archivo no es válido. Sube un PDF o una imagen de hasta 25 MB.');
    }
    storedUrl = url;
  } else {
    const parsed = parseHttpsUrl(url, type === 'YOUTUBE' ? YOUTUBE_HOSTS : undefined);
    if (!parsed) throw new HttpError(400, 'El enlace debe ser una URL https válida.');
    storedUrl = parsed;
  }

  const resource = await prisma.classResource.create({ data: { classId, title, type, url: storedUrl } });
  return NextResponse.json({ success: true, resource });
});

export const DELETE = withAuth('resources DELETE', ['MENTOR', 'ADMIN'], async (req, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'ID de recurso requerido.');

  const resource = await prisma.classResource.findUnique({
    where: { id },
    include: { classSession: { select: { mentorId: true } } },
  });
  if (!resource) throw new HttpError(404, 'Recurso no encontrado.');
  if (user.role === 'MENTOR' && resource.classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No puedes eliminar recursos de clases que no dictas.');
  }

  await prisma.classResource.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
