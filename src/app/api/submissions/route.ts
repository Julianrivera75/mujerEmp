import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { notifyMany } from '@/lib/notifications';
import { deleteObject, keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { createSubmissionSchema, gradeSubmissionSchema } from '@/lib/schemas';
import { isLateSubmission, NOTES_MAX_LENGTH, submissionFiles, validateDelivery } from '@/lib/delivery';
import { ATTACHMENT_MAX_MB, nameFromKey } from '@/lib/file-types';
import { cleanText, parseHttpsUrl } from '@/lib/validators';

/** Archivos y enlace que llegan en la petición, en la forma nueva o en la antigua (un solo archivo o enlace). */
function parseDelivered(body: {
  files?: { key: string; name: string }[];
  link?: string | null;
  fileUrl?: string | null;
  fileType?: string;
}) {
  let files = body.files ?? [];
  let rawLink = body.link?.trim() || null;
  const legacy = body.fileUrl?.trim() || null;
  if (legacy && files.length === 0 && !rawLink) {
    if (body.fileType === 'PDF' || body.fileType === 'IMAGE' || body.fileType === 'DOC') {
      files = [{ key: legacy, name: nameFromKey(legacy) }];
    } else {
      rawLink = legacy;
    }
  }
  if (new Set(files.map((f) => f.key)).size !== files.length) {
    throw new HttpError(400, 'Hay un archivo repetido en tu entrega.');
  }
  let link: string | null = null;
  if (rawLink) {
    link = parseHttpsUrl(rawLink);
    if (!link) throw new HttpError(400, 'El enlace debe ser una URL https válida.');
  }
  return { files, link };
}

export const POST = withAuth('submissions POST', ['STUDENT'], async (req, user) => {
  const body = await parseBody(req, createSubmissionSchema);
  const { assignmentId, notes } = body;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      classId: true,
      title: true,
      dueDate: true,
      allowLate: true,
      fileRequirement: true,
      linkRequirement: true,
      textRequirement: true,
      maxFiles: true,
      classSession: { select: { mentorId: true } },
    },
  });
  if (!assignment) throw new HttpError(404, 'Tarea no encontrada.');

  // Solo puede entregar quien está inscrita en la clase de la tarea.
  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId: user.id } },
    select: { id: true },
  });
  if (!enrollment) throw new HttpError(403, 'No estás inscrita en la clase de esta tarea.');

  const now = new Date();
  if (!assignment.allowLate && isLateSubmission(now, assignment.dueDate)) {
    throw new HttpError(403, 'La fecha límite ya pasó y esta tarea no recibe entregas tardías.');
  }

  // Qué entregó (archivos subidos, enlace y/o texto) frente a lo que pide la tarea.
  const cleanNotes = cleanText(notes ?? '', NOTES_MAX_LENGTH) ?? '';
  const { files, link } = parseDelivered(body);
  const deliveryError = validateDelivery(assignment, { notes: cleanNotes, fileCount: files.length, link });
  if (deliveryError) throw new HttpError(400, deliveryError);

  for (const file of files) {
    if (!keyBelongsTo(file.key, 'submission', user.id) || !(await verifyUploadedObject(file.key, 'submission'))) {
      throw new HttpError(
        400,
        `El archivo "${file.name}" no es válido. Sube un PDF, una imagen o un documento de Office de hasta ${ATTACHMENT_MAX_MB} MB.`,
      );
    }
  }

  // Una entrega calificada queda cerrada: la mentora debe reabrirla quitando la nota.
  const previous = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    select: { grade: true, fileUrl: true, fileType: true, fileKeys: true, fileNames: true },
  });
  if (previous && previous.grade !== null) {
    throw new HttpError(409, 'Esta entrega ya fue calificada y no se puede modificar.');
  }

  // La entrega nueva usa las columnas nuevas; las de la forma antigua (fileUrl, fileType) quedan vacías.
  const data = {
    notes: cleanNotes,
    fileKeys: files.map((f) => f.key),
    fileNames: files.map((f) => cleanText(f.name, 120) ?? nameFromKey(f.key)),
    linkUrl: link,
    fileUrl: null,
    fileType: null,
    submittedAt: now,
  };
  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    update: data,
    create: { assignmentId, studentId: user.id, ...data },
  });

  // Los archivos que ya no forman parte de la entrega se eliminan del almacenamiento.
  if (previous) {
    const kept = new Set(files.map((f) => f.key));
    const replaced = submissionFiles(previous).filter((f) => !kept.has(f.key));
    await Promise.all(replaced.map((f) => deleteObject(f.key).catch(() => undefined)));
  }

  // Aviso a la mentora de la clase.
  const mentorId = assignment.classSession.mentorId;
  await notifyMany([mentorId], {
    type: 'SUBMISSION_RECEIVED',
    title: 'Nueva entrega',
    body: `${user.name} entregó "${assignment.title}".`,
    href: `/mentor/tareas?tarea=${assignmentId}`,
    dedupeKey: `sub:${submission.id}:${submission.submittedAt.getTime()}`,
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    submission,
    late: isLateSubmission(submission.submittedAt, assignment.dueDate),
  });
});

/** La estudiante quita su entrega: la tarea vuelve a quedar sin entregar. */
export const DELETE = withAuth('submissions DELETE', ['STUDENT'], async (req, user) => {
  const assignmentId = new URL(req.url).searchParams.get('assignmentId');
  if (!assignmentId) throw new HttpError(400, 'ID de tarea requerido.');

  const submission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    select: { id: true, grade: true, fileUrl: true, fileType: true, fileKeys: true, fileNames: true },
  });
  if (!submission) throw new HttpError(404, 'No has entregado esta tarea.');
  if (submission.grade !== null) {
    throw new HttpError(409, 'Esta entrega ya fue calificada y no se puede quitar.');
  }

  await prisma.submission.delete({ where: { id: submission.id } });
  await Promise.all(submissionFiles(submission).map((f) => deleteObject(f.key).catch(() => undefined)));
  return NextResponse.json({ success: true });
});

export const PUT = withAuth('submissions PUT', ['MENTOR', 'ADMIN'], async (req, user) => {
  const { submissionId, grade, feedback } = await parseBody(req, gradeSubmissionSchema);

  let parsedGrade: number | null = null;
  if (grade !== undefined && grade !== null && grade !== '') {
    parsedGrade = Number(grade);
    if (!Number.isFinite(parsedGrade) || parsedGrade < 1 || parsedGrade > 5) {
      throw new HttpError(400, 'La calificación debe estar entre 1.0 y 5.0.');
    }
  }

  const existing = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { classSession: { select: { mentorId: true } } } } },
  });
  if (!existing) throw new HttpError(404, 'Entrega no encontrada.');
  if (user.role === 'MENTOR' && existing.assignment.classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No puedes calificar entregas de clases que no dictas.');
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { grade: parsedGrade, feedback: cleanText(feedback ?? '', 2000), gradedAt: new Date() },
    include: {
      student: { select: { id: true, name: true, email: true } },
      assignment: { select: { id: true, title: true } },
    },
  });

  if (parsedGrade !== null) {
    await notifyMany([updated.student.id], {
      type: 'SUBMISSION_GRADED',
      title: 'Tarea calificada',
      body: `"${updated.assignment.title}": ${parsedGrade} / 5.0`,
      href: `/estudiante/tareas?tarea=${updated.assignment.id}`,
      dedupeKey: `graded:${updated.id}:${updated.gradedAt?.getTime() ?? Date.now()}`,
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true, submission: updated });
});
