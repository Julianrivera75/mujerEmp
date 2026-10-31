'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Bell, Download, Save, Search } from 'lucide-react';
import { Badge, StatusPill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { ResponsiveTable } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { downloadTextFile, toCsv } from '@/lib/csv';
import { logClientError } from '@/lib/client-log';
import { rankMatches } from '@/lib/text-search';
import type { ModuleStatus } from '@/lib/modules';

type RuleType = 'MIN_ATTENDANCE_PERCENT' | 'MIN_ATTENDED_DAYS';

interface ModuleRef {
  number: number;
  title: string;
}

interface Rule {
  moduleNumber: number;
  title: string;
  ruleType: RuleType;
  threshold: number;
}

interface EligibilityRow {
  studentId: string;
  name: string;
  email: string;
  memberNumber: string | null;
  accountStatus: string;
  isTestAccount: boolean;
  moduleNumber: number;
  moduleTitle: string;
  status: ModuleStatus;
  percentage: number;
  attended: number;
  total: number;
  ruleType: RuleType;
  threshold: number;
}

const STATUS_LABEL: Record<ModuleStatus, string> = {
  available: 'Disponible',
  locked: 'Bloqueado',
  'low-attendance': 'Falta asistencia',
  'no-classes': 'Sin clases',
};

const STATUS_TONE: Record<ModuleStatus, 'success' | 'neutral' | 'warning'> = {
  available: 'success',
  locked: 'neutral',
  'low-attendance': 'warning',
  'no-classes': 'neutral',
};

const ruleText = (ruleType: RuleType, threshold: number) =>
  ruleType === 'MIN_ATTENDED_DAYS'
    ? `Al menos ${threshold} día${threshold === 1 ? '' : 's'}`
    : `Al menos ${threshold}%`;

export default function AdminCertificatesPage() {
  const [modules, setModules] = useState<ModuleRef[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [rows, setRows] = useState<EligibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('1');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeTest, setIncludeTest] = useState(false);
  const [savingModule, setSavingModule] = useState<number | null>(null);
  const [notifying, setNotifying] = useState(false);
  const { show } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (moduleFilter) params.set('moduleNumber', moduleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (includeTest) params.set('includeTest', 'true');

      const [eligibilityRes, rulesRes] = await Promise.all([
        fetch(`/api/admin/certificates?${params}`),
        fetch('/api/admin/certificates/rules'),
      ]);
      const eligibilityBody = await eligibilityRes.json();
      const rulesBody = await rulesRes.json();
      setModules(eligibilityBody.modules || []);
      setRows(eligibilityBody.rows || []);
      setRules(rulesBody.rules || []);
    } catch (err) {
      logClientError('Error cargando certificados:', err);
      show('error', 'No se pudieron cargar los certificados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, statusFilter, includeTest]);

  const filteredRows = useMemo(
    () => rankMatches(rows, search, (r) => [r.name, r.email]).map((r) => r.item),
    [rows, search],
  );

  const counts = useMemo(() => {
    const eligible = filteredRows.filter((r) => r.status === 'available').length;
    return { eligible, notEligible: filteredRows.length - eligible, total: filteredRows.length };
  }, [filteredRows]);

  const saveRule = async (rule: Rule) => {
    setSavingModule(rule.moduleNumber);
    try {
      const res = await fetch('/api/admin/certificates/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleNumber: rule.moduleNumber, ruleType: rule.ruleType, threshold: rule.threshold }),
      });
      const body = await res.json();
      if (!res.ok) {
        show('error', body.error || 'No se pudo guardar la regla.');
        return;
      }
      show('success', `Regla del módulo ${rule.moduleNumber} actualizada.`);
      await load();
    } catch (err) {
      logClientError('Error guardando la regla:', err);
      show('error', 'Error de conexión al guardar la regla.');
    } finally {
      setSavingModule(null);
    }
  };

  const updateLocalRule = (moduleNumber: number, patch: Partial<Rule>) => {
    setRules((prev) => prev.map((r) => (r.moduleNumber === moduleNumber ? { ...r, ...patch } : r)));
  };

  const exportCsv = () => {
    if (filteredRows.length === 0) {
      show('info', 'No hay datos para exportar con el filtro actual.');
      return;
    }
    const csv = toCsv(
      ['Estudiante', 'Correo', 'Número', 'Módulo', 'Estado', 'Asistencia', 'Porcentaje', 'Regla', 'Cuenta de prueba'],
      filteredRows.map((r) => [
        r.name,
        r.email,
        r.memberNumber || 'N/A',
        `${r.moduleNumber} - ${r.moduleTitle}`,
        STATUS_LABEL[r.status],
        `${r.attended} de ${r.total} días`,
        r.percentage,
        ruleText(r.ruleType, r.threshold),
        r.isTestAccount ? 'sí' : 'no',
      ]),
    );
    downloadTextFile(`certificados_elegibilidad_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    show('success', 'Reporte exportado.');
  };

  const notifyNow = async () => {
    setNotifying(true);
    try {
      const res = await fetch('/api/admin/certificates/notify', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        show('error', body.error || 'No se pudo enviar el aviso.');
        return;
      }
      show('success', `Certificados disponibles notificados a ${body.notified} estudiantes.`);
    } catch (err) {
      logClientError('Error notificando certificados:', err);
      show('error', 'Error de conexión al enviar el aviso.');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Reportes"
        title="Certificados por módulo"
        description="Elegibilidad de cada estudiante según la regla configurada por módulo."
        actions={
          <>
            <Button variant="secondary" loading={notifying} leftIcon={<Bell className="h-4 w-4" />} onClick={notifyNow}>
              Notificar certificados disponibles
            </Button>
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
              Exportar CSV
            </Button>
          </>
        }
      />

      <Card variant="glass" className="p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-800">
          <Award className="h-5 w-5 text-role-ink" />
          <span>Regla de elegibilidad por módulo</span>
        </h2>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.moduleNumber}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Módulo {rule.moduleNumber}
                </p>
                <p className="text-sm font-bold text-slate-800">{rule.title}</p>
              </div>
              <div className="w-full sm:w-64">
                <Select
                  label="Tipo de regla"
                  value={rule.ruleType}
                  onChange={(e) => updateLocalRule(rule.moduleNumber, { ruleType: e.target.value as RuleType })}
                >
                  <option value="MIN_ATTENDANCE_PERCENT">Porcentaje mínimo de asistencia</option>
                  <option value="MIN_ATTENDED_DAYS">Días mínimos con asistencia</option>
                </Select>
              </div>
              <div className="w-full sm:w-32">
                <Input
                  label={rule.ruleType === 'MIN_ATTENDED_DAYS' ? 'Días' : 'Porcentaje'}
                  type="number"
                  min={1}
                  max={rule.ruleType === 'MIN_ATTENDANCE_PERCENT' ? 100 : undefined}
                  value={rule.threshold}
                  onChange={(e) => updateLocalRule(rule.moduleNumber, { threshold: Number(e.target.value) })}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={savingModule === rule.moduleNumber}
                leftIcon={<Save className="h-4 w-4" />}
                onClick={() => saveRule(rule)}
              >
                Guardar
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="glass" className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-800">Elegibilidad de estudiantes</h2>
            <p className="text-xs text-slate-500">
              {counts.total} evaluadas · <strong className="text-emerald-700">{counts.eligible} elegibles</strong> ·{' '}
              <strong className="text-amber-700">{counts.notEligible} no elegibles</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-40">
              <Select label="Módulo" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                <option value="">Todos</option>
                {modules.map((m) => (
                  <option key={m.number} value={m.number}>
                    Módulo {m.number}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="available">Disponible</option>
                <option value="locked">Bloqueado</option>
                <option value="low-attendance">Falta asistencia</option>
                <option value="no-classes">Sin clases</option>
              </Select>
            </div>
            <div className="w-full sm:w-64">
              <Input
                label="Buscar"
                placeholder="Nombre o correo..."
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        <label className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={includeTest}
            onChange={(e) => setIncludeTest(e.target.checked)}
          />
          Incluir cuentas de prueba (@empoderas.org)
        </label>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState icon={Award} title="No hay estudiantes con este filtro" />
        ) : (
          <ResponsiveTable
            caption="Elegibilidad de certificados"
            rows={filteredRows}
            rowKey={(r) => `${r.studentId}-${r.moduleNumber}`}
            columns={[
              {
                header: 'Estudiante',
                primary: true,
                cell: (r) => (
                  <>
                    <p className="font-bold text-slate-800">{r.name}</p>
                    <p className="text-[11px] font-normal text-slate-500">
                      {r.email} {r.isTestAccount && <Badge tone="neutral">Prueba</Badge>}
                    </p>
                  </>
                ),
              },
              {
                header: 'Módulo',
                cell: (r) => (
                  <span className="font-semibold text-slate-700">
                    {r.moduleNumber}. {r.moduleTitle}
                  </span>
                ),
              },
              {
                header: 'Asistencia',
                cell: (r) => (
                  <div className="min-w-[140px]">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                      <span>
                        {r.attended} de {r.total} días
                      </span>
                      <span>{r.percentage}%</span>
                    </div>
                    <ProgressBar
                      value={r.percentage}
                      label={`Asistencia de ${r.name} en el módulo ${r.moduleNumber}`}
                    />
                  </div>
                ),
              },
              {
                header: 'Regla',
                cell: (r) => <span className="text-slate-600">{ruleText(r.ruleType, r.threshold)}</span>,
              },
              {
                header: 'Estado',
                align: 'center',
                cell: (r) => <StatusPill label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
