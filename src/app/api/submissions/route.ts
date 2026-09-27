import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { notifyMany } from '@/lib/notifications';
import { deleteObject, keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { createSubmissionSchema, gradeSubmissionSchema } from '@/lib/schemas';
import { cleanText, parseHttpsUrl } from '@/lib/validators';

export const POST = withAuth('submissions POST', ['STUDENT'], async (req, user) => {
  const { assignmentId, notes, fileUrl, fileType } = await parseBody(req, createSubmissionSchema);

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { classId: true, title: true, classSession: { select: { mentorId: true } } },
  });
  if (!assignment) throw new HttpError(404, 'Tarea no encontrada.');

  // Solo puede entregar quien está inscrita en la clase de la tarea.
  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId: user.id } },
    select: { id: true },
  });
  if (!enrollment) throw new HttpError(403, 'No estás inscrita en la clase de esta tarea.');

  const type = fileType ?? 'LINK';
  let storedFile: string | null = null;
  if (type === 'LINK') {
    if (fileUrl && fileUrl.trim() !== '') {
      storedFile = parseHttpsUrl(fileUrl);
      if (!storedFile) throw new HttpError(400, 'El enlace debe ser una URL https válida.');
    }
  } else {
    if (!keyBelongsTo(fileUrl, 'submission', user.id) || !(await verifyUploadedObject(fileUrl, 'submission'))) {
      throw new HttpError(400, 'El archivo no es válido. Sube un PDF o una imagen de hasta 15 MB.');
    }
    storedFile = fileUrl;
  }

  const cleanNotes = cleanText(notes ?? '', 5000) ?? '';

  // Una entrega calificada queda cerrada: la mentora debe reabrirla quitando la nota.
  const previous = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    select: { grade: true, fileUrl: true, fileType: true },
  });
  if (previous && previous.grade !== null) {
    throw new HttpError(409, 'Esta entrega ya fue calificada y no se puede modificar.');
  }

  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    update: { notes: cleanNotes, fileUrl: storedFile, fileType: type, submittedAt: new Date() },
    create: {
      assignmentId,
      studentId: user.id,
      notes: cleanNotes,
      fileUrl: storedFile,
      fileType: type,
      submittedAt: new Date(),
    },
  });

  // Si se reemplazó el archivo subido, el anterior se elimina del almacenamiento.
  if (
    previous?.fileUrl &&
    previous.fileUrl !== storedFile &&
    (previous.fileType === 'PDF' || previous.fileType === 'IMAGE')
  ) {
    await deleteObject(previous.fileUrl).catch(() => undefined);
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

  return NextResponse.json({ success: true, submission });
});

/** La estudiante quita su entrega: la tarea vuelve a quedar sin entregar. */
export const DELETE = withAuth('submissions DELETE', ['STUDENT'], async (req, user) => {
  const assignmentId = new URL(req.url).searchParams.get('assignmentId');
  if (!assignmentId) throw new HttpError(400, 'ID de tarea requerido.');

  const submission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    select: { id: true, grade: true, fileUrl: true, fileType: true },
  });
  if (!submission) throw new HttpError(404, 'No has entregado esta tarea.');
  if (submission.grade !== null) {
    throw new HttpError(409, 'Esta entrega ya fue calificada y no se puede quitar.');
  }

  await prisma.submission.delete({ where: { id: submission.id } });
  if (submission.fileUrl && (submission.fileType === 'PDF' || submission.fileType === 'IMAGE')) {
    await deleteObject(submission.fileUrl).catch(() => undefined);
  }
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
