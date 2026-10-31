import { loadDaySummaries } from './attendance-days-db';
import { summarizeByMonth } from './attendance-days';
import { type CertificateRule, moduleStatus } from './certificate-eligibility';
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
}

/** Elegibilidad por módulo de cada estudiante, con la misma regla usada por la estudiante, el admin y el PDF. */
export async function loadModuleEligibility(
  studentIds: readonly string[],
  options: { mentorId?: string; now?: Date } = {},
): Promise<Map<string, ModuleEligibility[]>> {
  if (studentIds.length === 0) return new Map();
  const now = options.now ?? new Date();

  const [summaries, rules] = await Promise.all([
    loadDaySummaries(studentIds, options),
    getCertificateRules(),
  ]);

  return new Map(
    studentIds.map((studentId) => {
      const months = summarizeByMonth(summaries.get(studentId)?.days ?? []);
      const eligibility = CERTIFICATE_MODULES.map((module) => {
        const month = months.get(module.monthKey);
        const total = month?.totalDays ?? 0;
        const attended = month?.attendedDays ?? 0;
        const rule = rules.get(module.number) ?? FALLBACK_RULE;
        return {
          number: module.number,
          title: module.title,
          monthKey: module.monthKey,
          status: moduleStatus(module.monthKey, now, attended, total, rule),
          percentage: attendancePercentage(attended, total),
          attended,
          total,
          opensAt: certificateOpensAt(module.monthKey).toISOString(),
          rule,
        };
      });
      return [studentId, eligibility];
    }),
  );
}
