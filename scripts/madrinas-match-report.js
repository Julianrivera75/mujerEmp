/*
 * Reporte de solo lectura: cruza la lista de "Madrinas" (pagaron su cupo, no les aplica la regla
 * de asistencia del certificado) contra las cuentas reales de estudiantes, y busca candidatas para
 * "Katia" (asistencia manual pedida por coordinación). No modifica nada.
 *
 * Es el paso de revisión humana antes de aplicar certificateExempt o marcar asistencia manual:
 * compartir esta tabla con el usuario/coordinadora y esperar confirmación explícita de cada
 * coincidencia antes de aplicar nada (ver plan "Certificados — ajustes post-lanzamiento").
 *
 * Solo lectura (reporte):
 *   railway run node scripts/madrinas-match-report.js
 *
 * Aplicar el flag certificateExempt=true SOLO a los IDs confirmados por el usuario:
 *   railway run node scripts/madrinas-match-report.js --apply id1,id2,id3
 *
 * Marcar presente a una estudiante en todas sus clases ya pasadas que todavía no tiene marcadas:
 *   railway run node scripts/madrinas-match-report.js --mark-attended <studentId>
 */
const { PrismaClient } = require('@prisma/client');

const TEST_ACCOUNT_DOMAIN = '@empoderas.org';

// Lista oficial de Madrinas 2026-2027 (21 de 256), tal como la pasó la coordinación.
const MADRINAS = [
  'Aceneth Patino',
  'Astrid Valderrana Mancera',
  'Claudia Calle',
  'Claudia Martinez Realtor',
  'Claudia Saucedo',
  'Victoria Debs',
  'Erika Cole',
  'Teresa Julieth Betancur Matiz',
  'Maria Jose Sanchez Mejia',
  'María Velandia',
  'Mariana Santos',
  'Martha Rojas',
  'Melida Orozco',
  'Mercedes Bermeo',
  'Nathaly Pavon Sanchez',
  'Nidia',
  'Noelia Taborda',
  'Norma Llorente',
  'Sirley Cardona',
  'Zaida Rengifo',
  'Zulma Castro Muñoz',
];

/** minúsculas, sin tildes, espacios colapsados — para comparar nombres sin depender de cómo los escribió cada quien. */
function normalize(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Similitud por palabras en común (Jaccard sobre el conjunto de palabras normalizadas) + bonus si una contiene a la otra. */
function score(a, b) {
  const wa = new Set(normalize(a).split(' ').filter(Boolean));
  const wb = new Set(normalize(b).split(' ').filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  const common = [...wa].filter((w) => wb.has(w)).length;
  const jaccard = common / new Set([...wa, ...wb]).size;
  const substring = normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a)) ? 0.25 : 0;
  return Math.min(1, jaccard + substring);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const applyIndex = process.argv.indexOf('--apply');
    const applyIds = applyIndex >= 0 ? process.argv[applyIndex + 1].split(',').map((s) => s.trim()) : null;

    if (applyIds) {
      const result = await prisma.user.updateMany({
        where: { id: { in: applyIds }, role: 'STUDENT' },
        data: { certificateExempt: true },
      });
      console.log(`certificateExempt=true aplicado a ${result.count} cuenta(s): ${applyIds.join(', ')}`);
      return;
    }

    const markIndex = process.argv.indexOf('--mark-attended');
    const markStudentId = markIndex >= 0 ? process.argv[markIndex + 1] : null;

    if (markStudentId) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { studentId: markStudentId },
        include: { classSession: { select: { id: true, title: true, dateStart: true, status: true } } },
      });
      const existing = await prisma.attendance.findMany({ where: { studentId: markStudentId }, select: { classId: true } });
      const attendedIds = new Set(existing.map((a) => a.classId));
      const now = new Date();
      const toMark = enrollments
        .map((e) => e.classSession)
        .filter((c) => c.status !== 'CANCELADA' && c.dateStart.getTime() <= now.getTime() && !attendedIds.has(c.id));

      for (const c of toMark) {
        await prisma.attendance.upsert({
          where: { classId_studentId: { classId: c.id, studentId: markStudentId } },
          update: {},
          create: { classId: c.id, studentId: markStudentId, joinedAt: now, source: 'CARRY' },
        });
      }
      console.log(`Asistencia marcada a mano en ${toMark.length} clase(s) ya pasadas para ${markStudentId}:`);
      toMark.forEach((c) => console.log(`  - ${c.dateStart.toISOString()} — ${c.title} [${c.id}]`));
      return;
    }

    // No selecciona `certificateExempt`: la migración que la agrega todavía no está desplegada en producción
    // en el momento de este reporte (ver plan, el --apply corre después del deploy).
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', anonymizedAt: null, email: { not: { endsWith: TEST_ACCOUNT_DOMAIN } } },
      select: { id: true, name: true, email: true, memberNumber: true },
      orderBy: { name: 'asc' },
    });

    console.log('=== Madrinas: cruce de los 21 nombres contra cuentas de estudiantes ===\n');
    const madrinaRows = MADRINAS.map((listName) => {
      const ranked = students
        .map((s) => ({ s, sc: score(listName, s.name) }))
        .sort((a, b) => b.sc - a.sc)
        .slice(0, 3)
        .filter((r) => r.sc > 0);

      const best = ranked[0];
      const tipo = !best ? 'SIN_COINCIDENCIA' : best.sc >= 0.99 ? 'EXACTA' : 'A_REVISAR';
      const candidatos = ranked
        .map((r) => `${r.s.name} <${r.s.email}> [id:${r.s.id}] (${Math.round(r.sc * 100)}%)`)
        .join('  |  ');

      return { nombreLista: listName, tipo, candidatos: candidatos || '(ninguno)' };
    });
    console.table(madrinaRows);

    const sinCoincidencia = madrinaRows.filter((r) => r.tipo === 'SIN_COINCIDENCIA');
    if (sinCoincidencia.length > 0) {
      console.log('\n=== Búsqueda amplia para las que no tuvieron coincidencia (por nombre o apellido sueltos) ===\n');
      for (const row of sinCoincidencia) {
        const parts = normalize(row.nombreLista).split(' ').filter((w) => w.length > 2);
        const matches = students.filter((s) => {
          const n = normalize(s.name);
          return parts.some((p) => n.includes(p));
        });
        console.log(`-- "${row.nombreLista}" --`);
        if (matches.length === 0) {
          console.log('  Ninguna coincidencia ni por nombre ni por apellido sueltos.');
        } else {
          console.table(matches.map((s) => ({ nombre: s.name, correo: s.email, id: s.id })));
        }
      }
    }

    const exactas = madrinaRows.filter((r) => r.tipo === 'EXACTA').length;
    const aRevisar = madrinaRows.filter((r) => r.tipo === 'A_REVISAR').length;
    const sinMatch = madrinaRows.filter((r) => r.tipo === 'SIN_COINCIDENCIA').length;
    console.log(`\nExactas: ${exactas} / A revisar: ${aRevisar} / Sin coincidencia: ${sinMatch} / Total lista: ${MADRINAS.length}`);

    console.log('\n=== Candidatas para "Katia" ===\n');
    const katiaCandidates = students
      .filter((s) => normalize(s.name).includes('katia'))
      .map((s) => ({ nombre: s.name, correo: s.email, numero: s.memberNumber ?? '', id: s.id }));
    if (katiaCandidates.length === 0) {
      console.log('Ninguna estudiante con "katia" en el nombre (revisar si el nombre real es distinto, p. ej. un apodo).');
    } else {
      console.table(katiaCandidates);

      console.log('\n=== Clases inscritas de la candidata de Katia (para marcar presente en todas las que ya pasaron) ===\n');
      const katia = katiaCandidates[0];
      const enrollments = await prisma.classEnrollment.findMany({
        where: { studentId: katia.id },
        include: { classSession: { select: { id: true, title: true, dateStart: true, status: true } } },
        orderBy: { classSession: { dateStart: 'asc' } },
      });
      const attendances = await prisma.attendance.findMany({
        where: { studentId: katia.id },
        select: { classId: true },
      });
      const attendedIds = new Set(attendances.map((a) => a.classId));
      const now = new Date();
      const rows = enrollments.map((e) => {
        const c = e.classSession;
        const past = c.status === 'FINALIZADA' || c.dateStart.getTime() <= now.getTime();
        const yaPresente = attendedIds.has(c.id);
        return {
          classId: c.id,
          titulo: c.title,
          fecha: c.dateStart.toISOString(),
          estado: c.status,
          yaMarcada: yaPresente ? 'sí' : 'no',
          seMarcariaAhora: !yaPresente && past && c.status !== 'CANCELADA' ? 'SÍ' : 'no (ya marcada / cancelada / futura)',
        };
      });
      console.table(rows);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo generar el reporte:', error.message);
  process.exit(1);
});
