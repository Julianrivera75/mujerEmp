import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { createSubmissionSchema, gradeSubmissionSchema } from '@/lib/schemas';
import { cleanText, parseHttpsUrl } from '@/lib/validators';

export const POST = withAuth('submissions POST', ['STUDENT'], async (req, user) => {
  const { assignmentId, notes, fileUrl, fileType } = await parseBody(req, createSubmissionSchema);

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { classId: true } });
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

  return NextResponse.json({ success: true, submission });
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

  return NextResponse.json({ success: true, submission: updated });
});
