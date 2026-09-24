import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SUBMISSION_FILE_TYPES, cleanText, isOneOf, parseHttpsUrl } from '@/lib/validators';
import { keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import { logError } from '@/lib/log';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Solo las estudiantes pueden entregar tareas.' }, { status: 403 });
    }

    const body = await req.json();
    const { assignmentId, notes, fileUrl, fileType } = body;

    if (typeof assignmentId !== 'string' || !assignmentId) {
      return NextResponse.json({ error: 'ID de tarea requerido.' }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { classId: true } });
    if (!assignment) {
      return NextResponse.json({ error: 'Tarea no encontrada.' }, { status: 404 });
    }

    // Solo puede entregar quien está inscrita en la clase de la tarea.
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId: assignment.classId, studentId: user.id } },
      select: { id: true },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'No estás inscrita en la clase de esta tarea.' }, { status: 403 });
    }

    const type = fileType === undefined ? 'LINK' : fileType;
    if (!isOneOf(SUBMISSION_FILE_TYPES, type)) {
      return NextResponse.json({ error: 'Tipo de entrega inválido.' }, { status: 400 });
    }

    let storedFile: string | null = null;
    if (type === 'LINK') {
      if (typeof fileUrl === 'string' && fileUrl.trim() !== '') {
        storedFile = parseHttpsUrl(fileUrl);
        if (!storedFile) {
          return NextResponse.json({ error: 'El enlace debe ser una URL https válida.' }, { status: 400 });
        }
      }
    } else {
      if (!keyBelongsTo(fileUrl, 'submission', user.id) || !(await verifyUploadedObject(fileUrl, 'submission'))) {
        return NextResponse.json({ error: 'El archivo no es válido. Sube un PDF o una imagen de hasta 15 MB.' }, { status: 400 });
      }
      storedFile = fileUrl;
    }

    const cleanNotes = cleanText(notes, 5000) ?? '';

    const submission = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      update: { notes: cleanNotes, fileUrl: storedFile, fileType: type, submittedAt: new Date() },
      create: { assignmentId, studentId: user.id, notes: cleanNotes, fileUrl: storedFile, fileType: type, submittedAt: new Date() },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    logError('submissions POST', error);
    return NextResponse.json({ error: 'Error al enviar la entrega.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo mentores o administradores pueden calificar.' }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, grade, feedback } = body;

    if (typeof submissionId !== 'string' || !submissionId) {
      return NextResponse.json({ error: 'ID de entrega requerido.' }, { status: 400 });
    }

    let parsedGrade: number | null = null;
    if (grade !== undefined && grade !== null && grade !== '') {
      parsedGrade = Number(grade);
      if (!Number.isFinite(parsedGrade) || parsedGrade < 1 || parsedGrade > 5) {
        return NextResponse.json({ error: 'La calificación debe estar entre 1.0 y 5.0.' }, { status: 400 });
      }
    }

    const existing = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { classSession: { select: { mentorId: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Entrega no encontrada.' }, { status: 404 });
    }

    if (user.role === 'MENTOR' && existing.assignment.classSession.mentorId !== user.id) {
      return NextResponse.json({ error: 'No puedes calificar entregas de clases que no dictas.' }, { status: 403 });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { grade: parsedGrade, feedback: cleanText(feedback, 2000), gradedAt: new Date() },
      include: {
        student: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    logError('submissions PUT', error);
    return NextResponse.json({ error: 'Error al calificar la entrega.' }, { status: 500 });
  }
}
