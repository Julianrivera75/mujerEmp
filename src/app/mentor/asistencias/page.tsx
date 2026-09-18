'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table, THead, TRow, TCell } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';

interface MentorAttendanceLog {
  id: string;
  joinedAt: string;
  student: { id: string; name: string; email: string };
  classSession: { id: string; title: string; dateStart: string; meetLink: string | null };
}

export default function MentorAttendancesPage() {
  const [attendances, setAttendances] = useState<MentorAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/attendances');
        const data = await res.json();
        setAttendances(data.attendances || []);
      } catch (err) {
        console.error('Error cargando asistencias del mentor:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        eyebrow="Asistencia"
        title="Asistencia de estudiantes a mis clases"
        description="Registro cronológico de las estudiantes que hicieron clic en el enlace de Google Meet de tus sesiones."
      />

      <Card variant="glass" className="p-6">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : attendances.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Aún no hay registros de asistencia a tus clases" />
        ) : (
          <Table>
            <THead>
              <TRow>
                <TCell head>Estudiante</TCell>
                <TCell head>Clase / sesión</TCell>
                <TCell head>Fecha y hora de clic</TCell>
                <TCell head className="text-center">
                  Estado
                </TCell>
              </TRow>
            </THead>
            <tbody>
              {attendances.map((log) => {
                const clickDate = new Date(log.joinedAt);
                const formatted = `${clickDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} a las ${clickDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                return (
                  <TRow key={log.id}>
                    <TCell>
                      <p className="font-bold text-slate-800">{log.student.name}</p>
                      <p className="text-slate-400 text-[11px]">{log.student.email}</p>
                    </TCell>
                    <TCell className="font-semibold text-slate-700">{log.classSession.title}</TCell>
                    <TCell>
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-role-accent" />
                        {formatted}
                      </span>
                    </TCell>
                    <TCell className="text-center">
                      <StatusPill label="Conectada" tone="success" />
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
