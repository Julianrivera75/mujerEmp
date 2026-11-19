'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Ban, Bell, Download, FileDown, Save, Search, ShieldCheck, Undo2 } from 'lucide-react';
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
  override: { action: 'AUTHORIZED' | 'BLOCKED'; reason: string; createdByName: string; createdAt: string } | null;
}

const STATUS_LABEL: Record<ModuleStatus, string> = {
  available: 'Disponible',
  locked: 'Bloqueado por fecha',
  'low-attendance': 'Falta asistencia',
  'no-classes': 'Sin clases',
  blocked: 'Bloqueada por admin',
};

const STATUS_TONE: Record<ModuleStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  available: 'success',
  locked: 'neutral',
  'low-attendance': 'warning',
  'no-classes': 'neutral',
  blocked: 'danger',
};

const ruleText = (ruleType: RuleType, threshold: number) =>
  ruleType === 'MIN_ATTENDED_DAYS'
    ? `Al menos ${threshold} día${threshold === 1 ? '' : 's'}`
    : `Al menos ${threshold}%`;

interface RosterStudent {
  id: string;
  name: string;
  email: string;
}

interface OverrideRow {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  moduleNumber: number;
  action: 'AUTHORIZED' | 'BLOCKED';
  reason: string;
  createdByName: string;
  createdAt: string;
}

export default function AdminCertificatesPage() {
  const [modules, setModules] = useState<ModuleRef[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [rows, setRows] = useState<EligibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('1');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeTest, setIncludeTest] = useState(false);
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [savingModule, setSavingModule] = useState<number | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [overrideModule, setOverrideModule] = useState('1');
  const [overrideAction, setOverrideAction] = useState<'AUTHORIZED' | 'BLOCKED'>('AUTHORIZED');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideSelected, setOverrideSelected] = useState<Set<string>>(new Set());
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { show } = useToast();

  const keyOf = (r: EligibilityRow) => `${r.studentId}-${r.moduleNumber}`;
  const toggleSelected = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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

  /** Roster de estudiantes (id, nombre, correo) para elegir a quién autorizar/bloquear; no depende del filtro de módulo de la tabla. */
  const loadRoster = async () => {
    try {
      const params = new URLSearchParams({ moduleNumber: '1' });
      if (includeTest) params.set('includeTest', 'true');
      const res = await fetch(`/api/admin/certificates?${params}`);
      const body = await res.json();
      const rosterRows: EligibilityRow[] = body.rows || [];
      setRoster(rosterRows.map((r) => ({ id: r.studentId, name: r.name, email: r.email })));
    } catch (err) {
      logClientError('Error cargando estudiantes:', err);
    }
  };

  const loadOverrides = async () => {
    try {
      const res = await fetch('/api/admin/certificates/overrides');
      const body = await res.json();
      setOverrides(body.overrides || []);
    } catch (err) {
      logClientError('Error cargando autorizaciones/bloqueos:', err);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, statusFilter, includeTest]);

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeTest]);

  useEffect(() => {
    loadOverrides();
  }, []);

  const filteredRows = useMemo(() => {
    const byAccountStatus = accountStatusFilter
      ? rows.filter((r) => r.accountStatus === accountStatusFilter)
      : rows;
    return rankMatches(byAccountStatus, search, (r) => [r.name, r.email]).map((r) => r.item);
  }, [rows, search, accountStatusFilter]);

  const counts = useMemo(() => {
    const eligible = filteredRows.filter((r) => r.status === 'available').length;
    return { eligible, notEligible: filteredRows.length - eligible, total: filteredRows.length };
  }, [filteredRows]);

  const filteredRoster = useMemo(
    () => rankMatches(roster, overrideSearch, (s) => [s.name, s.email]).map((r) => r.item),
    [roster, overrideSearch],
  );

  const toggleOverrideSelected = (studentId: string) =>
    setOverrideSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  /** Autoriza o bloquea el certificado del módulo elegido a cada estudiante marcada. */
  const submitOverride = async () => {
    if (overrideSelected.size === 0 || overrideReason.trim().length < 5) return;
    setOverrideSubmitting(true);
    try {
      const res = await fetch('/api/admin/certificates/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [...overrideSelected],
          moduleNumber: Number(overrideModule),
          action: overrideAction,
          reason: overrideReason,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show('error', body.error || 'No se pudo guardar la autorización/bloqueo.');
        return;
      }
      show(
        'success',
        `${overrideAction === 'AUTHORIZED' ? 'Autorización' : 'Bloqueo'} guardado para ${overrideSelected.size} estudiante(s).`,
      );
      setOverrideSelected(new Set());
      setOverrideReason('');
      await Promise.all([load(), loadOverrides()]);
    } catch (err) {
      logClientError('Error guardando autorización/bloqueo:', err);
      show('error', 'Error de conexión al guardar.');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  /** Revierte una autorización/bloqueo: la estudiante vuelve a depender de la regla normal del módulo. */
  const revokeOverride = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch('/api/admin/certificates/overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show('error', body.error || 'No se pudo revertir.');
        return;
      }
      show('success', 'Revertido. Vuelve a aplicar la regla normal del módulo.');
      await Promise.all([load(), loadOverrides()]);
    } catch (err) {
      logClientError('Error revirtiendo autorización/bloqueo:', err);
      show('error', 'Error de conexión al revertir.');
    } finally {
      setRevokingId(null);
    }
  };

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
      [
        'Estudiante',
        'Correo',
        'Número',
        'Módulo',
        'Estado de la cuenta',
        'Estado del certificado',
        'Asistencia',
        'Porcentaje',
        'Regla',
        'Cuenta de prueba',
        'Autorización/bloqueo manual',
        'Motivo',
      ],
      filteredRows.map((r) => [
        r.name,
        r.email,
        r.memberNumber || 'N/A',
        `${r.moduleNumber} - ${r.moduleTitle}`,
        r.accountStatus === 'ACTIVO' ? 'Activa' : 'Inactiva',
        STATUS_LABEL[r.status],
        `${r.attended} de ${r.total} días`,
        r.percentage,
        ruleText(r.ruleType, r.threshold),
        r.isTestAccount ? 'sí' : 'no',
        r.override ? `${r.override.action === 'AUTHORIZED' ? 'Autorizada' : 'Bloqueada'} por ${r.override.createdByName}` : '',
        r.override?.reason || '',
      ]),
    );
    downloadTextFile(`certificados_elegibilidad_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    show('success', 'Reporte exportado.');
  };

  /** Genera y descarga el PDF real del certificado, igual que lo haría la propia estudiante. */
  const generateCertificate = async (row: EligibilityRow, { silent = false } = {}): Promise<boolean> => {
    const key = keyOf(row);
    setGenerating(key);
    try {
      const res = await fetch(`/api/admin/certificates/pdf?studentId=${row.studentId}&moduleNumber=${row.moduleNumber}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        show('error', `${row.name} (módulo ${row.moduleNumber}): ${body.error || 'no se pudo generar el certificado.'}`);
        return false;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${row.name.replace(/\s+/g, '-').toLowerCase()}-modulo-${row.moduleNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (!silent) show('success', `Certificado del módulo ${row.moduleNumber} de ${row.name} generado.`);
      return true;
    } catch (err) {
      logClientError('Error generando certificado:', err);
      show('error', `${row.name} (módulo ${row.moduleNumber}): error de conexión al generar el certificado.`);
      return false;
    } finally {
      setGenerating(null);
    }
  };

  /** Genera, una por una, el certificado de cada fila marcada. */
  const generateSelected = async () => {
    const targets = filteredRows.filter((r) => selected.has(keyOf(r)));
    if (targets.length === 0) {
      show('info', 'No hay filas seleccionadas.');
      return;
    }
    setBulkRunning(true);
    let ok = 0;
    try {
      // Una descarga a la vez, para no saturar al navegador.
      for (const row of targets) {
        if (await generateCertificate(row, { silent: true })) ok += 1;
      }
      show('success', `Se generaron ${ok} de ${targets.length} certificados seleccionados.`);
      setSelected(new Set());
    } finally {
      setBulkRunning(false);
    }
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
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-slate-800">
          <ShieldCheck className="h-5 w-5 text-role-ink" />
          <span>Autorizar o bloquear certificado</span>
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Para una estudiante puntual, al margen de la regla del módulo. Queda registrado con el motivo, quién lo hizo
          y cuándo, y se puede revertir.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
          <div className="space-y-3">
            <Select label="Módulo" value={overrideModule} onChange={(e) => setOverrideModule(e.target.value)}>
              {modules.map((m) => (
                <option key={m.number} value={m.number}>
                  Módulo {m.number}: {m.title}
                </option>
              ))}
            </Select>
            <div className="flex gap-4 text-sm font-semibold text-slate-700">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="overrideAction"
                  className="h-4 w-4 border-slate-300"
                  checked={overrideAction === 'AUTHORIZED'}
                  onChange={() => setOverrideAction('AUTHORIZED')}
                />
                Autorizar
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="overrideAction"
                  className="h-4 w-4 border-slate-300"
                  checked={overrideAction === 'BLOCKED'}
                  onChange={() => setOverrideAction('BLOCKED')}
                />
                Bloquear
              </label>
            </div>
            <Input
              label="Motivo"
              placeholder="Por qué se autoriza o bloquea..."
              autoComplete="off"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <Button
              className="w-full"
              loading={overrideSubmitting}
              disabled={overrideSelected.size === 0 || overrideReason.trim().length < 5}
              leftIcon={overrideAction === 'AUTHORIZED' ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              onClick={submitOverride}
            >
              {overrideAction === 'AUTHORIZED' ? 'Autorizar' : 'Bloquear'} a {overrideSelected.size} estudiante(s)
            </Button>
          </div>

          <div className="lg:col-span-2">
            <Input
              placeholder="Buscar estudiante..."
              aria-label="Buscar estudiante para autorizar o bloquear"
              autoComplete="off"
              value={overrideSearch}
              onChange={(e) => setOverrideSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
              {filteredRoster.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">Nadie se parece a esa búsqueda.</p>
              ) : (
                filteredRoster.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 border-b border-slate-50 p-2 text-xs last:border-b-0 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={overrideSelected.has(s.id)}
                      onChange={() => toggleOverrideSelected(s.id)}
                    />
                    <span className="font-semibold text-slate-700">{s.name}</span>
                    <span className="text-slate-400">{s.email}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {overrides.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold text-slate-700">Autorizaciones y bloqueos activos</h3>
            <ResponsiveTable
              caption="Autorizaciones y bloqueos activos"
              rows={overrides}
              rowKey={(o) => o.id}
              columns={[
                {
                  header: 'Estudiante',
                  primary: true,
                  cell: (o) => (
                    <>
                      <p className="font-bold text-slate-800">{o.studentName}</p>
                      <p className="text-[11px] font-normal text-slate-500">{o.studentEmail}</p>
                    </>
                  ),
                },
                { header: 'Módulo', cell: (o) => <span className="font-semibold text-slate-700">{o.moduleNumber}</span> },
                {
                  header: 'Acción',
                  align: 'center',
                  cell: (o) => (
                    <StatusPill
                      label={o.action === 'AUTHORIZED' ? 'Autorizada' : 'Bloqueada'}
                      tone={o.action === 'AUTHORIZED' ? 'success' : 'danger'}
                    />
                  ),
                },
                { header: 'Motivo', cell: (o) => <span className="text-slate-600">{o.reason}</span> },
                {
                  header: 'Quién y cuándo',
                  cell: (o) => (
                    <span className="text-slate-600">
                      {o.createdByName} ·{' '}
                      {new Date(o.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  ),
                },
                {
                  header: 'Revertir',
                  align: 'center',
                  cell: (o) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={revokingId === o.id}
                      leftIcon={<Undo2 className="h-4 w-4" />}
                      onClick={() => revokeOverride(o.id)}
                    >
                      Revertir
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        )}
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
                <option value="locked">Bloqueado por fecha</option>
                <option value="low-attendance">Falta asistencia</option>
                <option value="no-classes">Sin clases</option>
                <option value="blocked">Bloqueada por admin</option>
              </Select>
            </div>
            <div className="w-40">
              <Select
                label="Cuenta"
                value={accountStatusFilter}
                onChange={(e) => setAccountStatusFilter(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="ACTIVO">Activas</option>
                <option value="INACTIVO">Inactivas</option>
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

        {!loading && filteredRows.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <span className="text-xs font-semibold text-slate-600">{selected.size} seleccionadas</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelected(new Set(filteredRows.map((r) => keyOf(r))))}
            >
              Seleccionar todas ({filteredRows.length})
            </Button>
            <Button size="sm" variant="ghost" disabled={selected.size === 0} onClick={() => setSelected(new Set())}>
              Limpiar selección
            </Button>
            <Button
              size="sm"
              loading={bulkRunning}
              disabled={selected.size === 0}
              leftIcon={<FileDown className="h-4 w-4" />}
              onClick={generateSelected}
              className="ml-auto"
            >
              Generar certificados seleccionados
            </Button>
          </div>
        )}

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
                header: 'Sel.',
                align: 'center',
                cell: (r) => (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={selected.has(keyOf(r))}
                    onChange={() => toggleSelected(keyOf(r))}
                    aria-label={`Seleccionar certificado del módulo ${r.moduleNumber} de ${r.name}`}
                  />
                ),
              },
              {
                header: 'Estudiante',
                primary: true,
                cell: (r) => (
                  <>
                    <p className="font-bold text-slate-800">{r.name}</p>
                    <p className="text-[11px] font-normal text-slate-500">
                      {r.email} {r.isTestAccount && <Badge tone="neutral">Prueba</Badge>}{' '}
                      {r.accountStatus !== 'ACTIVO' && <Badge tone="danger">Inactiva</Badge>}
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
                cell: (r) => (
                  <div className="flex flex-col items-center gap-1">
                    <StatusPill label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
                    {r.override && (
                      <p className="max-w-[180px] text-center text-[10px] text-slate-500" title={r.override.reason}>
                        Por {r.override.createdByName}: {r.override.reason}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                header: 'Certificado',
                align: 'center',
                cell: (r) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={generating === `${r.studentId}-${r.moduleNumber}`}
                    leftIcon={<FileDown className="h-4 w-4" />}
                    onClick={() => generateCertificate(r)}
                  >
                    Generar
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
