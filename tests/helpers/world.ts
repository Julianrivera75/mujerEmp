import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const PASSWORD = 'clave-de-prueba-123';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Attendance","Submission","Assignment","ClassResource","ClassEnrollment","ClassSession","LoginAttempt","User" RESTART IDENTITY CASCADE',
  );
}

async function makeUser(name: string, role: 'ADMIN' | 'MENTOR' | 'STUDENT', extra: Record<string, unknown> = {}) {
  const email = `${name.toLowerCase()}@prueba.test`;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      documentId: `DOC-${name}`,
      phone: '3000000000',
      ...extra,
    },
  });
  return { id: user.id, email: user.email, name: user.name, role };
}

/**
 * Escenario común: dos mentoras con una clase cada una; Sofia inscrita en la clase de Carolina; Lucia sin inscribir.
 * Carolina tiene una tarea con una entrega de Sofia.
 */
export async function createWorld() {
  const admin = await makeUser('Admin', 'ADMIN');
  const carolina = await makeUser('Carolina', 'MENTOR');
  const valeria = await makeUser('Valeria', 'MENTOR');
  const sofia = await makeUser('Sofia', 'STUDENT');
  const lucia = await makeUser('Lucia', 'STUDENT');

  const start = new Date(Date.now() + 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

  const claseCarolina = await prisma.classSession.create({
    data: {
      title: 'Clase de Carolina',
      dateStart: start,
      dateEnd: end,
      monthKey,
      mentorId: carolina.id,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      enrollments: { create: [{ studentId: sofia.id }] },
    },
  });
  const claseValeria = await prisma.classSession.create({
    data: { title: 'Clase de Valeria', dateStart: start, dateEnd: end, monthKey, mentorId: valeria.id },
  });

  const tarea = await prisma.assignment.create({
    data: {
      classId: claseCarolina.id,
      creatorId: carolina.id,
      title: 'Ensayo',
      description: 'Escribe un ensayo',
      dueDate: end,
    },
  });
  const entrega = await prisma.submission.create({
    data: {
      assignmentId: tarea.id,
      studentId: sofia.id,
      notes: 'Mi entrega',
      fileUrl: `entregas/${sofia.id}/ensayo.pdf`,
      fileType: 'PDF',
    },
  });

  return { admin, carolina, valeria, sofia, lucia, claseCarolina, claseValeria, tarea, entrega };
}
