import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Solo los estudiantes pueden entregar tareas.' }, { status: 403 });
    }

    const body = await req.json();
    const { assignmentId, notes, fileUrl, fileType } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'ID de tarea requerido.' }, { status: 400 });
    }

    // Upsert la entrega del estudiante
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: user.id,
        },
      },
      update: {
        notes: notes || '',
        fileUrl: fileUrl || null,
        fileType: fileType || 'LINK',
        submittedAt: new Date(),
      },
      create: {
        assignmentId,
        studentId: user.id,
        notes: notes || '',
        fileUrl: fileUrl || null,
        fileType: fileType || 'LINK',
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Error al entregar tarea:', error);
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

    if (!submissionId) {
      return NextResponse.json({ error: 'ID de entrega requerido.' }, { status: 400 });
    }

    const existing = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { classSession: { select: { mentorId: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Entrega no encontrada.' }, { status: 404 });
    }

    if (user.role === 'MENTOR' && existing.assignment.classSession.mentorId !== user.id) {
      return NextResponse.json({ error: 'No podés calificar entregas de clases que no dictás.' }, { status: 403 });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: grade !== undefined && grade !== '' ? parseFloat(grade) : null,
        feedback: feedback !== undefined ? feedback.trim() : null,
        gradedAt: new Date(),
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error('Error al calificar entrega:', error);
    return NextResponse.json({ error: 'Error al calificar la entrega.' }, { status: 500 });
  }
}
