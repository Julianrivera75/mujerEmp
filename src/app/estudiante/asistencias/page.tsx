'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Calendar, Award } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Table, THead, TRow, TCell } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useSessionUser } from '@/lib/user-context';

interface AttendanceItem {
  id: string;
  joinedAt: string;
  classSession: { id: string; title: string; dateStart: string; meetLink: string | null; mentor: { name: string } };
}

export default function StudentAttendanceHistoryPage() {
  const user = useSessionUser();
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [attRes, classesRes] = await Promise.all([fetch('/api/admin/attendances'), fetch('/api/classes')]);
        const classesData = await classesRes.json();
        setTotalClasses((classesData.classes || []).length);

        const attData = await attRes.json();
        const allAtt: (AttendanceItem & { student: { id: string } })[] = attData.attendances || [];
        setAttendances(allAtt.filter((a) => a.student.id === user.id));
      } catch (err) {
        console.error('Error cargando asistencias:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const percentage = totalClasses > 0 ? Math.round((attendances.length / totalClasses) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Mi progreso"
        title="Mi historial de asistencia virtual"
        description="Cada vez que haces clic en el enlace de Google Meet para conectarte a tu clase, el sistema registra tu asistencia automáticamente."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard label="Clases asistidas" value={attendances.length} icon={CheckCircle2} />
        <StatCard label="Total clases programadas" value={totalClasses} icon={Calendar} />
        <StatCard
          label="Porcentaje de participación"
          value={percentage}
          icon={Award}
          hint="% de las clases programadas"
        />
      </div>

      <Card variant="glass" className="p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-800">
          Detalle de clases conectadas en Google Meet
        </h2>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : attendances.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aún no has registrado asistencias"
            description="Conéctate a tus próximas clases para marcar tu presencia."
          />
        ) : (
          <Table>
            <THead>
              <TRow>
                <TCell head>Clase / sesión</TCell>
                <TCell head>Docente</TCell>
                <TCell head>Fecha y hora de clic</TCell>
                <TCell head className="text-center">
                  Estado
                </TCell>
              </TRow>
            </THead>
            <tbody>
              {attendances.map((item) => {
                const clickDate = new Date(item.joinedAt);
                const formatted = `${clickDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} a las ${clickDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
                return (
                  <TRow key={item.id}>
                    <TCell className="font-bold text-slate-800">{item.classSession.title}</TCell>
                    <TCell className="font-medium text-slate-600">{item.classSession.mentor.name}</TCell>
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
