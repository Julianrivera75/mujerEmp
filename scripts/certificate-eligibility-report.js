/*
 * Reporte de solo lectura: elegibilidad de certificado de cada estudiante en cada módulo, con la
 * regla configurada, las autorizaciones/bloqueos manuales activos y las exenciones ("Madrina").
 * No modifica nada. Es el paso de revisión humana antes de habilitar cualquier cambio de datos o de
 * decisión de certificados: compartir esta tabla y los conteos con la coordinadora y esperar su
 * confirmación.
 *
 * Ejecutar contra la base real con el CLI de Railway:
 *
 *   railway run node scripts/certificate-eligibility-report.js
 *
 * Excluye las cuentas con dominio @empoderas.org (las mismas que usa prisma/seed.js para las
 * cuentas de prueba) y las cuentas anonimizadas. Las estudiantes inactivas se incluyen pero se
 * marcan aparte, para que la coordinadora decida si les aplica certificado.
 *
 * Nota: esto es solo un reporte. El panel de admin ya no exige ninguna de estas condiciones para
 * descargar un certificado (ver src/lib/certificate-issue.ts) y las exentas ("Madrina") tienen los
 * 5 certificados disponibles desde el día uno sin importar la fecha (ver moduleStatus() en
 * src/lib/certificate-eligibility.ts).
 */
const { PrismaClient } = require('@prisma/client');

const TEST_ACCOUNT_DOMAIN = '@empoderas.org';
const ATTENDANCE_TIME_ZONE = 'America/Bogota';

// Mismos 5 módulos que src/lib/modules.ts (CERTIFICATE_MODULES); se duplican aquí a propósito
// para no depender de los módulos TypeScript del proyecto desde un script plano de Node.
const MODULES = [
  { number: 1, monthKey: '2026-10', title: 'Zarpando: Alistando las Velas' },
  { number: 2, monthKey: '2026-11', title: 'Tomando el Timón: Gobernando tu Destino' },
  { number: 3, monthKey: '2026-12', title: 'Resistiendo la Tormenta: El Equipaje' },
  { number: 4, monthKey: '2027-01', title: 'La Brújula y el Faro: Divisando el Propósito' },
  { number: 5, monthKey: '2027-02', title: 'Arribo a Puerto: Tierra Firme' },
];

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
 * limitado a un mes, para no depender de los módulos TypeScript del proyecto desde un script plano.
 */
function summarizeModule(monthKey, classes, attendances, now) {
  const active = classes.filter((c) => c.status !== 'CANCELADA' && dayKeyOf(c.dateStart).slice(0, 7) === monthKey);
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

function meetsRule(rule, attended, total) {
  if (rule.ruleType === 'MIN_ATTENDED_DAYS') return attended >= rule.threshold;
  return total > 0 && Math.round((attended / total) * 100) >= rule.threshold;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', anonymizedAt: null, email: { not: { endsWith: TEST_ACCOUNT_DOMAIN } } },
      select: { id: true, name: true, email: true, memberNumber: true, status: true, certificateExempt: true },
      orderBy: { name: 'asc' },
    });
    const studentIds = students.map((s) => s.id);

    const [enrollments, attendances, rules, overrides] = await Promise.all([
      prisma.classEnrollment.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          classSession: { select: { id: true, dateStart: true, status: true, meetLink: true } },
        },
      }),
      prisma.attendance.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          classId: true,
          classSession: { select: { id: true, dateStart: true, status: true, meetLink: true } },
        },
      }),
      prisma.certificateModuleRule.findMany({ select: { moduleNumber: true, ruleType: true, threshold: true } }),
      prisma.certificateOverride.findMany({
        where: { studentId: { in: studentIds }, revokedAt: null },
        select: { studentId: true, moduleNumber: true, action: true },
      }),
    ]);

    const ruleByModule = new Map(rules.map((r) => [r.moduleNumber, r]));
    const overrideByStudentModule = new Map(overrides.map((o) => [`${o.studentId}:${o.moduleNumber}`, o.action]));

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

    for (const mod of MODULES) {
      const rule = ruleByModule.get(mod.number) ?? { ruleType: 'MIN_ATTENDANCE_PERCENT', threshold: 80 };
      const rows = students.map((s) => {
        const { totalDays, attendedDays } = summarizeModule(
          mod.monthKey,
          [...(classesOf.get(s.id)?.values() ?? [])],
          attendancesOf.get(s.id) ?? [],
          now,
        );
        const override = overrideByStudentModule.get(`${s.id}:${mod.number}`) ?? null;
        let estado;
        if (s.certificateExempt) estado = override === 'BLOCKED' ? 'bloqueada (manual)' : 'exenta (Madrina)';
        else if (override === 'BLOCKED') estado = 'bloqueada (manual)';
        else if (override === 'AUTHORIZED') estado = 'autorizada (manual)';
        else if (totalDays === 0) estado = 'sin clases';
        else if (meetsRule(rule, attendedDays, totalDays)) estado = 'elegible por regla';
        else estado = 'no elegible';

        return {
          nombre: s.name,
          correo: s.email,
          numero: s.memberNumber ?? '',
          cuenta: s.status === 'ACTIVO' ? 'activa' : 'inactiva',
          dias: totalDays,
          asistidos: attendedDays,
          estado,
        };
      });

      const counts = rows.reduce((acc, r) => {
        acc[r.estado] = (acc[r.estado] ?? 0) + 1;
        return acc;
      }, {});

      console.log(
        `\n=== Módulo ${mod.number}: ${mod.title} (${mod.monthKey}) — regla: ${rule.ruleType === 'MIN_ATTENDED_DAYS' ? `al menos ${rule.threshold} día(s)` : `al menos ${rule.threshold}%`} ===`,
      );
      console.table(rows);
      console.log(
        Object.entries(counts)
          .map(([estado, n]) => `${estado}: ${n}`)
          .join(' · '),
        `· total evaluadas: ${rows.length}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo generar el reporte:', error.message);
  process.exit(1);
});
