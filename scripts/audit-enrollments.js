/*
 * Revisión de inscripciones: lista las estudiantes activas a las que les falta alguna clase de la cohorte actual
 * (no cancelada, desde MODULE_1_MONTH_KEY, pasada o futura) y las cuentas con más de un rol. Por defecto solo lee
 * y no modifica nada.
 *
 * Con --apply inscribe a cada estudiante activa en las clases de la cohorte que le faltan. Solo agrega inscripciones:
 * nunca borra ni cambia las existentes. Ojo: si la administración sacó a propósito a alguien de una clase, --apply la
 * volvería a agregar; por eso conviene revisar primero la lista.
 *
 * Contra la base real (accesible solo desde la red interna de Railway) se ejecuta dentro del servicio:
 *   railway ssh --service app -- node scripts/audit-enrollments.js
 *   railway ssh --service app -- node scripts/audit-enrollments.js --apply
 */
const { PrismaClient } = require('@prisma/client');

// Primer mes de la cohorte de certificación 2026-2027 (ver CERTIFICATE_MODULES[0].monthKey en src/lib/modules.ts).
const MODULE_1_MONTH_KEY = '2026-10';
const MAX_LISTED = 60;

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const classes = await prisma.classSession.findMany({
      where: { status: { not: 'CANCELADA' }, monthKey: { gte: MODULE_1_MONTH_KEY } },
      select: { id: true, title: true, dateStart: true, _count: { select: { enrollments: true } } },
      orderBy: { dateStart: 'asc' },
    });
    console.log(`Clases de la cohorte actual: ${classes.length}`);
    for (const c of classes) {
      console.log(
        ` - ${c.dateStart.toISOString().slice(0, 16)}  inscritas ${c._count.enrollments}  ${c.title.slice(0, 60)}`,
      );
    }

    const students = await prisma.user.findMany({
      where: {
        status: 'ACTIVO',
        anonymizedAt: null,
        OR: [{ role: 'STUDENT' }, { extraRoles: { has: 'STUDENT' } }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        enrolledClasses: { where: { classId: { in: classes.map((c) => c.id) } }, select: { classId: true } },
      },
      orderBy: { name: 'asc' },
    });

    const missing = students
      .map((s) => ({
        ...s,
        absent: classes.filter((c) => !s.enrolledClasses.some((e) => e.classId === c.id)).map((c) => c.id),
      }))
      .filter((s) => s.absent.length > 0);

    console.log(`\nEstudiantes activas: ${students.length}`);
    console.log(`Con todas las clases de la cohorte: ${students.length - missing.length}`);
    console.log(`A las que les falta alguna clase de la cohorte: ${missing.length}`);
    for (const s of missing.slice(0, MAX_LISTED)) {
      const dual = s.role === 'STUDENT' ? '' : '  [cuenta con dos roles]';
      console.log(
        ` - ${s.name} <${s.email}>  faltan ${s.absent.length} de ${classes.length}  creada ${s.createdAt.toISOString().slice(0, 10)}${dual}`,
      );
    }
    if (missing.length > MAX_LISTED) console.log(` ... y ${missing.length - MAX_LISTED} más`);

    const dualRole = students.filter((s) => s.role !== 'STUDENT');
    console.log(
      `\nCuentas con dos roles (entran en la vista de su rol principal y deben cambiar a la de Estudiante): ${dualRole.length}`,
    );

    if (!apply) {
      console.log('\nSolo lectura: no se modificó nada. Repite con --apply para inscribir a las que faltan.');
      return;
    }

    let added = 0;
    for (const s of missing) {
      const result = await prisma.classEnrollment.createMany({
        data: s.absent.map((classId) => ({ classId, studentId: s.id })),
        skipDuplicates: true,
      });
      added += result.count;
    }
    console.log(`\nInscripciones agregadas: ${added}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
