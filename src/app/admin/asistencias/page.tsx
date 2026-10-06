'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Search, Award, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ResponsiveTable } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDateTimeSeconds, formatTimeSeconds, formatWeekdayDate } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface DayRow {
  studentId: string;
  name: string;
  email: string;
  memberNumber: string | null;
  day: string;
  firstJoinedAt: string | null;
  classesAttended: number;
  classesInDay: number;
  classTitles: string[];
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  totalDays: number;
  attendedDays: number;
  percentage: number;
}

/** El día viene como AAAA-MM-DD en hora de Colombia; se muestra a mediodía para que ninguna zona lo mueva de fecha. */
const dayDate = (day: string) => new Date(`${day}T12:00:00-05:00`);

export default function AdminAttendancePage() {
  const [days, setDays] = useState<DayRow[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { show } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/attendances');
        const data = await res.json();
        setDays(data.days || []);
        setStudentSummary(data.studentSummary || []);
      } catch (err) {
        logClientError('Error cargando asistencias:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredDays = days.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.classTitles.some((title) => title.toLowerCase().includes(q))
    );
  });

  const exportToCsv = () => {
    if (filteredDays.length === 0) {
      show('info', 'No hay datos para exportar con el filtro actual.');
      return;
    }

    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const headers = [
      'Estudiante',
      'Número de estudiante',
      'Correo',
      'Día',
      'Primer ingreso',
      'Charlas a las que entró',
      'Charlas del día',
      'Estado',
    ];
    const rows = filteredDays.map((d) =>
      [
        quote(d.name),
        quote(d.memberNumber || 'N/A'),
        quote(d.email),
        quote(d.day),
        quote(d.firstJoinedAt ? formatTimeSeconds(new Date(d.firstJoinedAt)) : ''),
        d.classesAttended,
        d.classesInDay,
        '"PRESENTE"',
      ].join(','),
    );

    const csvContent = '﻿' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_asistencia_por_dia_empoderas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show('success', 'Reporte exportado.');
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Reportes"
        title="Control y reporte de asistencias"
        description="La asistencia se mide por día: una estudiante está presente un día si entró al menos a una de las charlas de ese día."
        actions={
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportToCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-800">
          <Award className="h-5 w-5 text-role-ink" />
          <span>Porcentaje de asistencia por estudiante (sobre días con charlas)</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} variant="glass" className="h-32 animate-pulse p-5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studentSummary.map((st) => (
              <Card key={st.id} variant="glass" className="flex flex-col justify-between p-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{st.name}</span>
                    <StatusPill
                      label={st.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                      tone={st.status === 'ACTIVO' ? 'success' : 'danger'}
                    />
                  </div>
                  <p className="mb-3 text-xs text-slate-500">{st.email}</p>
                  <ProgressBar value={st.percentage} label={`Asistencia de ${st.name}`} className="mb-2" />
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
                  <span>
                    Presente <strong>{st.attendedDays}</strong> de {st.totalDays} días
                  </span>
                  <span className="text-sm font-black text-role-ink">{st.percentage}%</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card variant="glass" className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-800">Historial de asistencia por día</h2>
            <p className="text-xs text-slate-500">
              Un registro por estudiante y día, con el primer ingreso y a cuántas charlas del día entró.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Filtrar por alumna o charla..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filteredDays.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No se encontraron registros de asistencia" />
        ) : (
          <ResponsiveTable
            caption="Asistencia por día"
            rows={filteredDays}
            rowKey={(d) => `${d.studentId}-${d.day}`}
            columns={[
              {
                header: 'Estudiante',
                primary: true,
                cell: (d) => (
                  <>
                    <p className="font-bold text-slate-800">{d.name}</p>
                    <p className="text-[11px] font-normal text-slate-500">{d.email}</p>
                  </>
                ),
              },
              {
                header: 'Día',
                cell: (d) => (
                  <span className="font-semibold text-slate-700 first-letter:uppercase">
                    {formatWeekdayDate(dayDate(d.day))}
                  </span>
                ),
              },
              {
                header: 'Charlas a las que entró',
                cell: (d) => (
                  <span className="font-medium text-slate-600">
                    {d.classesAttended} de {d.classesInDay}
                  </span>
                ),
              },
              {
                header: 'Primer ingreso',
                cell: (d) => (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    {d.firstJoinedAt ? formatDateTimeSeconds(new Date(d.firstJoinedAt)) : '—'}
                  </span>
                ),
              },
              { header: 'Estado', align: 'center', cell: () => <StatusPill label="Presente" tone="success" /> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
