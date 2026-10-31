/*
 * Reporte de solo lectura: elegibilidad del Módulo 1 bajo la nueva regla (basta una asistencia).
 * No modifica nada. Es el paso de revisión humana antes de habilitar la descarga en producción
 * (ver plan "Certificados por módulo", punto 9): compartir esta tabla y los conteos con la
 * coordinadora y esperar su confirmación antes de desplegar las fases siguientes.
 *
 * Ejecutar contra la base real con el CLI de Railway:
 *
 *   railway run node scripts/certificate-eligibility-report.js
 *
 * Excluye las cuentas con dominio @empoderas.org (las mismas que usa prisma/seed.js para las
 * cuentas de prueba) y las cuentas anonimizadas.
 */
const { PrismaClient } = require('@prisma/client');

const MODULE_1_MONTH_KEY = '2026-10';
const TEST_ACCOUNT_DOMAIN = '@empoderas.org';
const ATTENDANCE_TIME_ZONE = 'America/Bogota';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATTENDANCE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Mismo criterio que src/lib/attendance-days.ts: el día de una charla es el día en que empieza, en hora de Colombia. */
function dayKeyOf(date) {
  return dayFormat.format(date);
}

/**
 * Días del módulo con al menos una charla elegible (ya empezada, no cancelada, con enlace de Meet),
 * más cualquier día en que la estudiante haya asistido. Replica src/lib/attendance-days.ts#summarizeDays
 * limitado al mes del Módulo 1, para no depender de los módulos TypeScript del proyecto desde un script plano.
 */
function summarizeModule1(classes, attendances, now) {
  const active = classes.filter((c) => c.status !== 'CANCELADA' && dayKeyOf(c.dateStart).slice(0, 7) === MODULE_1_MONTH_KEY);
  const byId = new Map(active.map((c) => [c.id, c]));

  const days = new Map();
  const entryOf = (day) => {
    let entry = days.get(day);
    if (!entry) {
      entry = { countable: false, present: false };
      days.set(day, entry);
    }
    return entry;
  };

  for (const c of active) {
    const entry = entryOf(dayKeyOf(c.dateStart));
    if (c.dateStart.getTime() <= now.getTime() && c.meetLink) entry.countable = true;
  }

  const seen = new Set();
  for (const a of attendances) {
    const cls = byId.get(a.classId);
    if (!cls) continue;
    if (seen.has(a.classId)) continue;
    seen.add(a.classId);
    entryOf(dayKeyOf(cls.dateStart)).present = true;
  }

  const relevantDays = [...days.values()].filter((d) => d.countable || d.present);
  const totalDays = relevantDays.length;
  const attendedDays = relevantDays.filter((d) => d.present).length;
  return { totalDays, attendedDays };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', anonymizedAt: null, email: { not: { endsWith: TEST_ACCOUNT_DOMAIN } } },
      select: { id: true, name: true, email: true, memberNumber: true },
      orderBy: { name: 'asc' },
    });

    const [enrollments, attendances] = await Promise.all([
      prisma.classEnrollment.findMany({
        where: { studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true, classSession: { select: { id: true, dateStart: true, status: true, meetLink: true } } },
      }),
      prisma.attendance.findMany({
        where: { studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true, classId: true, classSession: { select: { id: true, dateStart: true, status: true, meetLink: true } } },
      }),
    ]);

    const classesOf = new Map();
    const attendancesOf = new Map();
    for (const e of enrollments) {
      if (!classesOf.has(e.studentId)) classesOf.set(e.studentId, new Map());
      classesOf.get(e.studentId).set(e.classSession.id, e.classSession);
    }
    for (const a of attendances) {
      if (!classesOf.has(a.studentId)) classesOf.set(a.studentId, new Map());
      classesOf.get(a.studentId).set(a.classSession.id, a.classSession);
      if (!attendancesOf.has(a.studentId)) attendancesOf.set(a.studentId, []);
      attendancesOf.get(a.studentId).push({ classId: a.classId });
    }

    const rows = students.map((s) => {
      const { totalDays, attendedDays } = summarizeModule1(
        [...(classesOf.get(s.id)?.values() ?? [])],
        attendancesOf.get(s.id) ?? [],
        now,
      );
      return {
        nombre: s.name,
        correo: s.email,
        numero: s.memberNumber ?? '',
        diasModulo1: totalDays,
        diasAsistidos: attendedDays,
        elegible: attendedDays >= 1 ? 'sí' : 'no',
      };
    });

    const eligible = rows.filter((r) => r.elegible === 'sí').length;
    const notEligible = rows.length - eligible;

    console.log(`Módulo 1 (${MODULE_1_MONTH_KEY}) — regla nueva: basta con 1 día de asistencia.\n`);
    console.table(rows);
    console.log(`\nElegibles: ${eligible} / No elegibles: ${notEligible} / Total evaluadas: ${rows.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo generar el reporte:', error.message);
  process.exit(1);
});
