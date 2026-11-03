import { CERTIFICATE_MODULES } from './modules';
import prisma from './prisma';

/** Primer mes de la cohorte de certificación actual; las clases de meses anteriores son de cohortes previas. */
const COHORT_START_MONTH_KEY = CERTIFICATE_MODULES[0].monthKey;

/**
 * Inscribe a una estudiante en todas las clases de la cohorte actual (no canceladas, desde
 * `COHORT_START_MONTH_KEY`), sin importar si ya pasaron o todavía no — así ve también las
 * grabaciones de meses anteriores y sus certificados de módulos previos quedan coherentes.
 * Es idempotente: no duplica una inscripción que ya exista.
 */
export async function enrollInUpcomingClasses(studentId: string) {
  const classes = await prisma.classSession.findMany({
    where: { status: { not: 'CANCELADA' }, monthKey: { gte: COHORT_START_MONTH_KEY } },
    select: { id: true },
  });
  if (classes.length === 0) return 0;

  const result = await prisma.classEnrollment.createMany({
    data: classes.map((c) => ({ classId: c.id, studentId })),
    skipDuplicates: true,
  });
  return result.count;
}

export interface MissingEnrollmentsReport {
  totalClasses: number;
  totalStudents: number;
  /** Estudiantes a las que les falta al menos una clase de la cohorte actual. */
  missingStudents: number;
  /** Inscripciones que faltan en total (estudiante × clase). */
  missingEnrollments: number;
  /** Clases de la cohorte con estudiantes sin inscribir, de mayor a menor número de faltantes. */
  classes: { id: string; title: string; dateStart: Date; missing: number }[];
  /** Estudiantes con inscripciones faltantes, de mayor a menor número de faltantes. */
  students: { id: string; name: string; email: string; missing: number }[];
  /** Pares a crear; solo para uso interno (no se envía al navegador). */
  pairs: { classId: string; studentId: string }[];
}

/**
 * Qué inscripciones faltan: cada estudiante activa (con vigencia al día) debería estar en todas las clases de la
 * cohorte actual (no canceladas, desde `COHORT_START_MONTH_KEY`, pasadas o futuras). Solo lee; no modifica nada.
 */
export async function findMissingEnrollments(now = new Date()): Promise<MissingEnrollmentsReport> {
  const classes = await prisma.classSession.findMany({
    where: { status: { not: 'CANCELADA' }, monthKey: { gte: COHORT_START_MONTH_KEY } },
    select: { id: true, title: true, dateStart: true },
    orderBy: { dateStart: 'asc' },
  });
  const students = await prisma.user.findMany({
    where: {
      status: 'ACTIVO',
      anonymizedAt: null,
      OR: [{ role: 'STUDENT' }, { extraRoles: { has: 'STUDENT' } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: { in: classes.map((c) => c.id) } },
    select: { classId: true, studentId: true },
  });
  const enrolled = new Set(enrollments.map((e) => `${e.classId}:${e.studentId}`));

  const pairs: { classId: string; studentId: string }[] = [];
  const perClass = new Map<string, number>();
  const perStudent = new Map<string, number>();
  for (const cls of classes) {
    for (const student of students) {
      if (enrolled.has(`${cls.id}:${student.id}`)) continue;
      pairs.push({ classId: cls.id, studentId: student.id });
      perClass.set(cls.id, (perClass.get(cls.id) ?? 0) + 1);
      perStudent.set(student.id, (perStudent.get(student.id) ?? 0) + 1);
    }
  }

  return {
    totalClasses: classes.length,
    totalStudents: students.length,
    missingStudents: perStudent.size,
    missingEnrollments: pairs.length,
    classes: classes
      .filter((c) => perClass.has(c.id))
      .map((c) => ({ ...c, missing: perClass.get(c.id) ?? 0 }))
      .sort((a, b) => b.missing - a.missing),
    students: students
      .filter((s) => perStudent.has(s.id))
      .map((s) => ({ ...s, missing: perStudent.get(s.id) ?? 0 }))
      .sort((a, b) => b.missing - a.missing),
    pairs,
  };
}

const BATCH_SIZE = 1000;

/** Inscribe a las estudiantes en las clases de la cohorte que les faltan. Solo agrega: nunca borra ni cambia inscripciones. */
export async function syncMissingEnrollments(now = new Date()): Promise<number> {
  const { pairs } = await findMissingEnrollments(now);
  let added = 0;
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const result = await prisma.classEnrollment.createMany({
      data: pairs.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
    added += result.count;
  }
  return added;
}
