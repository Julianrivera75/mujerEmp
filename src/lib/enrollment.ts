import prisma from './prisma';

/**
 * Inscribe a una estudiante en todas las clases vigentes (no canceladas y que aún no terminaron),
 * sin importar el mes. Es idempotente: no duplica una inscripción que ya exista.
 */
export async function enrollInUpcomingClasses(studentId: string, now = new Date()) {
  const classes = await prisma.classSession.findMany({
    where: { status: { not: 'CANCELADA' }, dateEnd: { gte: now } },
    select: { id: true },
  });
  if (classes.length === 0) return 0;

  const result = await prisma.classEnrollment.createMany({
    data: classes.map((c) => ({ classId: c.id, studentId })),
    skipDuplicates: true,
  });
  return result.count;
}
