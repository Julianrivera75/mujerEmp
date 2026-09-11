import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    const where: any = {};
    if (classId) {
      where.classId = classId;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        classSession: {
          select: { id: true, title: true, dateStart: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        submissions: {
          where: user.role === 'STUDENT' ? { studentId: user.id } : undefined,
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return NextResponse.json({ error: 'Error al consultar tareas.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo mentores o administradores pueden crear tareas.' }, { status: 403 });
    }

    const body = await req.json();
    const { classId, title, description, dueDate } = body;

    if (!classId || !title || !description || !dueDate) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        creatorId: user.id,
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(dueDate),
      },
      include: {
        classSession: true,
      },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    return NextResponse.json({ error: 'Error al crear tarea.' }, { status: 500 });
  }
}
