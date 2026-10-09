import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { HttpError, MAX_ROWS, withAuth } from '@/lib/api';
import { logError, logWarn } from '@/lib/log';
import prisma from '@/lib/prisma';
import { notifyMany } from '@/lib/notifications';
import { createPresignedDownloadUrl, deleteObject, keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { createAssignmentSchema, updateAssignmentSchema } from '@/lib/schemas';
import { opensInBrowser } from '@/lib/file-types';
import { type DeliveryConfig, hasDeliveryChoice, legacyRequirements, submissionFiles } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

/**
 * Cambia la clave del archivo de instrucciones por una dirección firmada y temporal. Solo llega a quien ya puede ver
 * la tarea (la mentora de la clase, las inscritas y la administración), porque la lista ya está filtrada así.
 */
async function withAttachmentUrl<T extends { attachmentKey: string | null; attachmentName: string | null }>(
  assignment: T,
) {
  const { attachmentKey, ...rest } = assignment;
  // Los PDF y las imágenes se abren en el navegador; los documentos de Office se descargan con su nombre.
  const downloadName = rest.attachmentName && !opensInBrowser(rest.attachmentName) ? rest.attachmentName : undefined;
  const attachmentUrl = attachmentKey
    ? await createPresignedDownloadUrl(attachmentKey, 3600, downloadName).catch(() => null)
    : null;
  return { ...rest, attachmentUrl };
}

/** El archivo debe ser de quien lo sube, existir en el almacenamiento y ser de un tipo permitido. */
async function assertValidAttachment(attachment: { key: string }, userId: string) {
  if (
    !keyBelongsTo(attachment.key, 'assignment', userId) ||
    !(await verifyUploadedObject(attachment.key, 'assignment'))
  ) {
    throw new HttpError(400, 'El archivo no es válido. Adjunta un PDF o una imagen de hasta 15 MB.', undefined, {
      fields: { attachment: 'El archivo no es válido. Adjunta un PDF o una imagen de hasta 15 MB.' },
    });
  }
}

export const GET = withAuth('assignments GET', 'any', async (req, user) => {
  const classId = new URL(req.url).searchParams.get('classId');

  const where: Prisma.AssignmentWhereInput = {};
  if (classId) where.classId = classId;

  // Cada rol ve únicamente las tareas de sus propias clases.
  if (user.role === 'MENTOR') {
    where.classSession = { mentorId: user.id };
  } else if (user.role === 'STUDENT') {
    where.classSession = { enrollments: { some: { studentId: user.id } } };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      classSession: { select: { id: true, title: true, dateStart: true, _count: { select: { enrollments: true } } } },
      creator: { select: { id: true, name: true } },
      submissions: {
        where: user.role === 'STUDENT' ? { studentId: user.id } : undefined,
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: MAX_ROWS,
  });

  return NextResponse.json({ assignments: await Promise.all(assignments.map(withAttachmentUrl)) });
});

/** Margen para aceptar una fecha límite "de ahora" (por diferencias de reloj entre el navegador y el servidor). */
const PAST_DUE_TOLERANCE_MS = 5 * 60 * 1000;

/** Lee y valida el cuerpo; si algo falla, el error indica qué campo (`fields`) para pintarlo junto al campo. */
async function parseAssignmentBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'Solicitud inválida.');
  }
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fields[key] ??= issue.message;
  }
  throw new HttpError(400, result.error.issues[0]?.message ?? 'Datos inválidos.', undefined, { fields });
}

/** Qué se pide entregar: los requisitos nuevos, o lo que traduce la forma antigua, o lo que ya tenía la tarea. */
function resolveDelivery(
  body: {
    fileRequirement?: DeliveryConfig['fileRequirement'];
    linkRequirement?: DeliveryConfig['linkRequirement'];
    textRequirement?: DeliveryConfig['textRequirement'];
    maxFiles?: number;
    deliveryType?: Parameters<typeof legacyRequirements>[0];
    notesRequired?: boolean;
  },
  current: DeliveryConfig,
): DeliveryConfig {
  const usesNew =
    body.fileRequirement !== undefined ||
    body.linkRequirement !== undefined ||
    body.textRequirement !== undefined ||
    body.maxFiles !== undefined;
  let config: DeliveryConfig;
  if (usesNew) {
    config = {
      fileRequirement: body.fileRequirement ?? current.fileRequirement,
      linkRequirement: body.linkRequirement ?? current.linkRequirement,
      textRequirement: body.textRequirement ?? current.textRequirement,
      maxFiles: body.maxFiles ?? current.maxFiles,
    };
  } else if (body.deliveryType !== undefined) {
    config = { ...legacyRequirements(body.deliveryType, body.notesRequired ?? true), maxFiles: current.maxFiles };
  } else {
    config = current;
  }
  if (!hasDeliveryChoice(config)) {
    const message = 'Elige al menos una forma de entrega: archivo, enlace o texto.';
    throw new HttpError(400, message, undefined, { fields: { delivery: message } });
  }
  return config;
}

/** Lo que pide una tarea nueva si no se indica nada (como siempre: archivo o enlace, con comentario). */
const DEFAULT_DELIVERY: DeliveryConfig = {
  fileRequirement: 'OPTIONAL',
  linkRequirement: 'OPTIONAL',
  textRequirement: 'REQUIRED',
  maxFiles: 1,
};

const mustBeFuture = (dueDate: Date) => {
  if (dueDate.getTime() < Date.now() - PAST_DUE_TOLERANCE_MS) {
    throw new HttpError(400, 'La fecha límite debe ser futura.', undefined, {
      fields: { dueDate: 'La fecha límite debe ser futura.' },
    });
  }
};

export const POST = withAuth('assignments POST', ['MENTOR', 'ADMIN'], async (req, user) => {
  try {
    const body = await parseAssignmentBody(req, createAssignmentSchema);
    const { classId, title, description, attachment, dueDate } = body;
    const delivery = resolveDelivery(body, DEFAULT_DELIVERY);
    mustBeFuture(dueDate);

    const classSession = await prisma.classSession.findUnique({ where: { id: classId }, select: { mentorId: true } });
    if (!classSession) throw new HttpError(404, 'Clase no encontrada.');
    if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
      throw new HttpError(403, 'No puedes crear tareas en clases que no dictas.');
    }

    if (attachment) await assertValidAttachment(attachment, user.id);

    const created = await prisma.assignment.create({
      data: {
        classId,
        creatorId: user.id,
        title,
        description: description ?? '',
        dueDate,
        ...delivery,
        allowLate: body.allowLate ?? true,
        attachmentKey: attachment?.key ?? null,
        attachmentName: attachment?.name ?? null,
      },
      include: { classSession: { select: { id: true, title: true } } },
    });
    const assignment = await withAttachmentUrl(created);

    // Aviso a las estudiantes inscritas en la clase.
    const enrolled = await prisma.classEnrollment.findMany({ where: { classId }, select: { studentId: true } });
    let notified = 0;
    try {
      await notifyMany(
        enrolled.map((e) => e.studentId),
        {
          type: 'NEW_ASSIGNMENT',
          title: 'Nueva tarea',
          body: `${assignment.title} — ${assignment.classSession.title}`,
          href: `/estudiante/tareas?tarea=${assignment.id}`,
          dedupeKey: `new:${assignment.id}`,
        },
      );
      notified = enrolled.length;
    } catch (error) {
      // La tarea ya quedó guardada: se informa que los avisos fallaron en vez de ocultarlo.
      logError('assignments POST notify', error);
    }

    return NextResponse.json({ success: true, assignment, assignedTo: enrolled.length, notified });
  } catch (error) {
    if (error instanceof HttpError)
      logWarn('assignments POST', `persona=${user.id} estado=${error.status} ${error.message}`);
    throw error;
  }
});

/** La mentora de la clase (o la administración) puede corregir el título, la descripción y la fecha límite. */
export const PUT = withAuth('assignments PUT', ['MENTOR', 'ADMIN'], async (req, user) => {
  const body = await parseAssignmentBody(req, updateAssignmentSchema);
  const { id, title, description, attachment, dueDate, allowLate } = body;

  const existing = await prisma.assignment.findUnique({
    where: { id },
    include: { classSession: { select: { mentorId: true } } },
  });
  if (!existing) throw new HttpError(404, 'Tarea no encontrada.');
  if (user.role === 'MENTOR' && existing.classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No puedes modificar tareas de clases que no dictas.');
  }
  const delivery = resolveDelivery(body, existing);
  const deliveryChanged =
    delivery.fileRequirement !== existing.fileRequirement ||
    delivery.linkRequirement !== existing.linkRequirement ||
    delivery.textRequirement !== existing.textRequirement ||
    delivery.maxFiles !== existing.maxFiles;
  // Al editar se puede conservar una fecha ya pasada; si se cambia, debe ser futura.
  if (dueDate.getTime() !== existing.dueDate.getTime()) mustBeFuture(dueDate);

  // Archivo de instrucciones: sin `attachment` se conserva; `null` lo quita; un archivo nuevo lo reemplaza.
  const keepsAttachment = attachment === undefined ? Boolean(existing.attachmentKey) : attachment !== null;
  if ((description ?? '').length < 10 && !keepsAttachment) {
    throw new HttpError(
      400,
      'Escribe las instrucciones (mínimo 10 caracteres) o adjunta un archivo con ellas.',
      undefined,
      { fields: { description: 'Escribe las instrucciones (mínimo 10 caracteres) o adjunta un archivo con ellas.' } },
    );
  }
  const replacesAttachment = attachment !== undefined && attachment?.key !== existing.attachmentKey;
  if (attachment && replacesAttachment) await assertValidAttachment(attachment, user.id);

  const updated = await prisma.assignment.update({
    where: { id },
    data: {
      title,
      description: description ?? '',
      dueDate,
      ...(attachment !== undefined
        ? { attachmentKey: attachment?.key ?? null, attachmentName: attachment?.name ?? null }
        : {}),
      ...(deliveryChanged ? delivery : {}),
      ...(allowLate !== undefined ? { allowLate } : {}),
    },
    include: { classSession: { select: { id: true, title: true } } },
  });
  // El archivo anterior ya no se usa: se elimina del almacenamiento.
  if (replacesAttachment && existing.attachmentKey) await deleteObject(existing.attachmentKey).catch(() => undefined);
  return NextResponse.json({ success: true, assignment: await withAttachmentUrl(updated) });
});

/** Elimina la tarea con sus entregas, los avisos que generó y los archivos entregados. */
export const DELETE = withAuth('assignments DELETE', ['MENTOR', 'ADMIN'], async (req, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'ID de tarea requerido.');

  const existing = await prisma.assignment.findUnique({
    where: { id },
    include: {
      classSession: { select: { mentorId: true } },
      submissions: { select: { fileUrl: true, fileType: true, fileKeys: true, fileNames: true } },
    },
  });
  if (!existing) throw new HttpError(404, 'Tarea no encontrada.');
  if (user.role === 'MENTOR' && existing.classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No puedes eliminar tareas de clases que no dictas.');
  }

  // Las entregas se borran en cascada. Los avisos no tienen relación con la tarea: se identifican por su enlace.
  await prisma.$transaction([
    prisma.assignment.delete({ where: { id } }),
    prisma.notification.deleteMany({ where: { href: { contains: id } } }),
  ]);

  // Los archivos subidos (no los enlaces) se eliminan del almacenamiento.
  const files = existing.submissions.flatMap((s) => submissionFiles(s).map((f) => f.key));
  if (existing.attachmentKey) files.push(existing.attachmentKey);
  await Promise.all(files.map((key) => deleteObject(key).catch(() => undefined)));

  return NextResponse.json({ success: true, deletedSubmissions: existing.submissions.length });
});
