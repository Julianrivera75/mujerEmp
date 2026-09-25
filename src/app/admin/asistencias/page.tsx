'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Search, Award, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Table, THead, TRow, TCell } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatDateTimeSeconds, formatTimeSeconds } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface AttendanceLog {
  id: string;
  joinedAt: string;
  student: { id: string; name: string; email: string; documentId: string | null };
  classSession: {
    id: string;
    title: string;
    dateStart: string;
    meetLink: string | null;
    mentor: { id: string; name: string };
  };
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  totalEnrolled: number;
  totalAttended: number;
  percentage: number;
}

export default function AdminAttendancePage() {
  const [attendances, setAttendances] = useState<AttendanceLog[]>([]);
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
        setAttendances(data.attendances || []);
        setStudentSummary(data.studentSummary || []);
      } catch (err) {
        logClientError('Error cargando asistencias:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredLogs = attendances.filter((att) => {
    const q = search.toLowerCase();
    return (
      att.student.name.toLowerCase().includes(q) ||
      att.student.email.toLowerCase().includes(q) ||
      att.classSession.title.toLowerCase().includes(q)
    );
  });

  const exportToCsv = () => {
    if (filteredLogs.length === 0) {
      show('info', 'No hay datos para exportar con el filtro actual.');
      return;
    }

    const headers = ['Estudiante', 'Documento', 'Correo', 'Clase / Sesión', 'Docente', 'Fecha', 'Hora', 'Estado'];
    const rows = filteredLogs.map((log) => {
      const d = new Date(log.joinedAt);
      return [
        `"${log.student.name.replace(/"/g, '""')}"`,
        `"${(log.student.documentId || 'N/A').replace(/"/g, '""')}"`,
        `"${log.student.email.replace(/"/g, '""')}"`,
        `"${log.classSession.title.replace(/"/g, '""')}"`,
        `"${log.classSession.mentor.name.replace(/"/g, '""')}"`,
        `"${formatDate(d)}"`,
        `"${formatTimeSeconds(d)}"`,
        '"PRESENTE"',
      ].join(',');
    });

    const csvContent = '﻿' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_asistencias_empoderas_${new Date().toISOString().slice(0, 10)}.csv`);
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
        description="Registro automático generado cada vez que una estudiante hace clic en el enlace de Google Meet."
        actions={
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportToCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-800">
          <Award className="h-5 w-5 text-role-ink" />
          <span>Porcentaje de asistencia por estudiante</span>
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
                    Asistió a <strong>{st.totalAttended}</strong> de {st.totalEnrolled}
                  </span>
                  <span className="text-sm font-black text-role-ink">{st.percentage}%</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card variant="glass" className="p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-800">Historial detallado de ingresos</h2>
            <p className="text-xs text-slate-500">
              Fecha y hora exacta en la que cada estudiante dio clic para unirse a la sesión.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Filtrar por alumna o clase..."
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
        ) : filteredLogs.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No se encontraron registros de asistencia" />
        ) : (
          <Table caption="Registro de asistencias a clases">
            <THead>
              <TRow>
                <TCell head>Estudiante</TCell>
                <TCell head>Clase / módulo</TCell>
                <TCell head>Docente</TCell>
                <TCell head>Fecha y hora de clic</TCell>
                <TCell head className="text-center">
                  Estado
                </TCell>
              </TRow>
            </THead>
            <tbody>
              {filteredLogs.map((log) => {
                const clickDate = new Date(log.joinedAt);
                const formatted = formatDateTimeSeconds(clickDate);

                return (
                  <TRow key={log.id}>
                    <TCell>
                      <p className="font-bold text-slate-800">{log.student.name}</p>
                      <p className="text-[11px] text-slate-500">{log.student.email}</p>
                    </TCell>
                    <TCell>
                      <p className="font-semibold text-slate-700">{log.classSession.title}</p>
                    </TCell>
                    <TCell className="font-medium text-slate-600">{log.classSession.mentor.name}</TCell>
                    <TCell>
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        {formatted}
                      </span>
                    </TCell>
                    <TCell className="text-center">
                      <StatusPill label="Presente" tone="success" />
                    </TCell>
                  </TRow>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
