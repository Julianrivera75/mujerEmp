import { loadDaySummaries } from './attendance-days-db';
import { summarizeByMonth } from './attendance-days';
import { type CertificateOverrideAction, type CertificateRule, moduleStatus } from './certificate-eligibility';
import { attendancePercentage, CERTIFICATE_MODULES, certificateOpensAt, type ModuleStatus } from './modules';
import prisma from './prisma';

/** Umbral de respaldo si a un módulo le falta la fila de regla (no debería pasar: la migración siembra las 5). */
const FALLBACK_RULE: CertificateRule = { ruleType: 'MIN_ATTENDANCE_PERCENT', threshold: 80 };

/** Regla configurada de cada módulo (1 a 5), leída de `CertificateModuleRule`. */
export async function getCertificateRules(): Promise<Map<number, CertificateRule>> {
  const rows = await prisma.certificateModuleRule.findMany({
    select: { moduleNumber: true, ruleType: true, threshold: true },
  });
  const rules = new Map(rows.map((r) => [r.moduleNumber, { ruleType: r.ruleType, threshold: r.threshold }]));
  for (const module of CERTIFICATE_MODULES) {
    if (!rules.has(module.number)) rules.set(module.number, FALLBACK_RULE);
  }
  return rules;
}

interface CertificateOverrideInfo {
  id: string;
  action: CertificateOverrideAction;
  reason: string;
  createdByName: string;
  createdAt: string;
}

export interface ModuleEligibility {
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  monthKey: string;
  status: ModuleStatus;
  percentage: number;
  attended: number;
  total: number;
  opensAt: string;
  rule: CertificateRule;
  override: CertificateOverrideInfo | null;
}

/** Overrides activas (no revocadas) de las estudiantes pedidas, agrupadas por estudiante y por módulo. */
async function loadActiveOverrides(
  studentIds: readonly string[],
): Promise<Map<string, Map<number, CertificateOverrideInfo>>> {
  if (studentIds.length === 0) return new Map();
  const rows = await prisma.certificateOverride.findMany({
    where: { studentId: { in: [...studentIds] }, revokedAt: null },
    select: {
      id: true,
      studentId: true,
      moduleNumber: true,
      action: true,
      reason: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const byStudent = new Map<string, Map<number, CertificateOverrideInfo>>();
  for (const row of rows) {
    const byModule = byStudent.get(row.studentId) ?? new Map<number, CertificateOverrideInfo>();
    // Por el invariante de aplicación debería haber a lo sumo una activa por (estudiante, módulo); si hubiera
    // más de una por alguna carrera, nos quedamos con la primera (la más reciente, por el orderBy).
    if (!byModule.has(row.moduleNumber)) {
      byModule.set(row.moduleNumber, {
        id: row.id,
        action: row.action,
        reason: row.reason,
        createdByName: row.createdBy.name,
        createdAt: row.createdAt.toISOString(),
      });
    }
    byStudent.set(row.studentId, byModule);
  }
  return byStudent;
}

/** Elegibilidad por módulo de cada estudiante, con la misma regla usada por la estudiante, el admin y el PDF. */
export async function loadModuleEligibility(
  studentIds: readonly string[],
  options: { mentorId?: string; now?: Date } = {},
): Promise<Map<string, ModuleEligibility[]>> {
  if (studentIds.length === 0) return new Map();
  const now = options.now ?? new Date();

  const [summaries, rules, exemptRows, overrides] = await Promise.all([
    loadDaySummaries(studentIds, { ...options, now }),
    getCertificateRules(),
    prisma.user.findMany({ where: { id: { in: [...studentIds] } }, select: { id: true, certificateExempt: true } }),
    loadActiveOverrides(studentIds),
  ]);
  const exemptById = new Map(exemptRows.map((u) => [u.id, u.certificateExempt]));

  return new Map(
    studentIds.map((studentId) => {
      const months = summarizeByMonth(summaries.get(studentId)?.days ?? []);
      const exempt = exemptById.get(studentId) ?? false;
      const studentOverrides = overrides.get(studentId);
      const eligibility = CERTIFICATE_MODULES.map((module) => {
        const month = months.get(module.monthKey);
        const total = month?.totalDays ?? 0;
        const attended = month?.attendedDays ?? 0;
        const rule = rules.get(module.number) ?? FALLBACK_RULE;
        const override = studentOverrides?.get(module.number) ?? null;
        return {
          number: module.number,
          title: module.title,
          monthKey: module.monthKey,
          status: moduleStatus(module.monthKey, now, attended, total, rule, exempt, override?.action),
          percentage: attendancePercentage(attended, total),
          attended,
          total,
          opensAt: certificateOpensAt(module.monthKey).toISOString(),
          rule,
          override,
        };
      });
      return [studentId, eligibility];
    }),
  );
}
