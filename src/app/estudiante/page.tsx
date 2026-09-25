'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  BookOpen,
  ClipboardList,
  ChevronRight,
  Youtube,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSessionUser } from '@/lib/user-context';
import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from '@/lib/legal';
import JoinMeetButton from '@/components/JoinMeetButton';
import { formatDateLong, formatTimeRange, formatWeekdayDate } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface StudentClass {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  meetLink: string | null;
  youtubeUrl: string | null;
  status: string;
  mentor: { name: string; email: string };
  attendances: { studentId: string; joinedAt: string }[];
}

export default function StudentDashboardPage() {
  const user = useSessionUser();
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data.classes || []);
    } catch (err) {
      logClientError('Error cargando datos del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();
  const upcomingClasses = classes.filter((c) => c.status !== 'FINALIZADA');
  const completedClasses = classes.filter((c) => c.status === 'FINALIZADA' || new Date(c.dateEnd) < now);
  const totalAttended = classes.filter((c) => c.attendances.some((a) => a.studentId === user.id)).length;
  const progressPct = classes.length > 0 ? Math.round((totalAttended / classes.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-role-from via-purple-600 to-role-to p-8 text-white shadow-lift sm:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              Tu espacio de formación
            </span>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Bienvenida, {user.name.split(' ')[0]}</h1>
            <p className="mt-2 max-w-xl text-sm text-purple-100 sm:text-base">
              Conéctate a tus clases en Google Meet con un clic. Tu asistencia se registra de inmediato para tu
              certificado de cada módulo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              href="/estudiante/repositorio"
              variant="secondary"
              leftIcon={<Youtube className="h-4 w-4 text-red-600" />}
              className="border-none !bg-white !text-purple-900"
            >
              Clases grabadas
            </Button>
            <Button
              href="/estudiante/tareas"
              variant="secondary"
              leftIcon={<ClipboardList className="h-4 w-4" />}
              className="border-white/20 !bg-white/20 !text-white"
            >
              Mis tareas
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600">
            <Calendar className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Clases del programa</p>
            <p className="font-display text-2xl font-bold tabular-nums text-slate-800">{classes.length}</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Asistencias confirmadas</p>
            <p className="font-display text-2xl font-bold tabular-nums text-slate-800">{totalAttended}</p>
          </div>
        </Card>
        <Card variant="glass" className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Youtube className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Grabaciones disponibles</p>
            <p className="font-display text-2xl font-bold tabular-nums text-slate-800">
              {classes.filter((c) => c.youtubeUrl).length}
            </p>
          </div>
        </Card>
      </div>

      {classes.length > 0 && (
        <Card variant="tinted" className="p-6 sm:p-7">
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-role-from text-white shadow-soft">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Tu progreso hacia los certificados por módulo</h2>
                <p className="text-xs text-slate-600">
                  Requiere al menos un {CERTIFICATE_MIN_ATTENDANCE_PERCENT}% de asistencia a las sesiones en vivo vía
                  Google Meet.
                </p>
              </div>
            </div>
            <span className="self-start text-lg font-black text-role-ink sm:self-auto">{progressPct}% cumplido</span>
          </div>

          <ProgressBar value={progressPct} label="Avance de asistencia" className="mb-3 h-3" />

          <div className="flex justify-end">
            <Button
              href="/estudiante/certificado"
              variant="secondary"
              size="sm"
              leftIcon={<Award className="h-4 w-4" />}
            >
              Ver mis certificados
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-1 flex items-center gap-2.5 font-display text-xl font-bold text-slate-800">
          <Video className="h-5 w-5 text-role-ink" />
          <span>Tus próximas clases virtuales</span>
        </h2>
        <p className="mb-6 text-xs text-slate-500">
          Al dar clic en el botón de Google Meet se marcará tu asistencia automáticamente antes de abrir la sala
          virtual.
        </p>

        {loading ? (
          <SkeletonCard />
        ) : upcomingClasses.length === 0 ? (
          <Card variant="glass" className="p-0">
            <EmptyState
              icon={Calendar}
              title="No tienes clases próximas pendientes"
              description="Revisa el repositorio para ver clases grabadas de sesiones anteriores."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingClasses.map((cls, i) => {
              const start = new Date(cls.dateStart);
              const end = new Date(cls.dateEnd);
              const formattedDate = formatWeekdayDate(start);
              const formattedTime = formatTimeRange(start, end);
              const myAttendance = cls.attendances.find((a) => a.studentId === user.id);

              return (
                <Card
                  key={cls.id}
                  variant="glass"
                  className={i === 0 ? 'border-role-accent/20 p-6 shadow-lift sm:p-8' : 'p-6 sm:p-8'}
                >
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {i === 0 && <StatusPill label="Próxima clase" tone="info" />}
                        <StatusPill label={cls.status} tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'} />
                        <span className="text-xs font-bold capitalize text-role-ink">{formattedDate}</span>
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          <Clock className="h-3.5 w-3.5" />
                          {formattedTime}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-800">{cls.title}</h3>
                      {cls.description && <p className="text-xs leading-relaxed text-slate-600">{cls.description}</p>}
                      <p className="text-xs text-slate-500">
                        Mentora: <strong className="text-teal-700">{cls.mentor.name}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <JoinMeetButton
                        classId={cls.id}
                        meetLink={cls.meetLink}
                        alreadyAttended={Boolean(myAttendance)}
                        attendedAt={myAttendance?.joinedAt}
                        onAttendanceSuccess={loadData}
                      />
                      {cls.youtubeUrl && (
                        <Link
                          href="/estudiante/repositorio"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 hover:text-red-800"
                        >
                          <Youtube className="h-3.5 w-3.5" />
                          <span>Ver grabación en repositorio</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-800">
            <BookOpen className="h-5 w-5 text-role-ink" />
            <span>Clases que ya viste o cursaste</span>
          </h2>
          <Link
            href="/estudiante/repositorio"
            className="flex items-center gap-1 text-xs font-bold text-role-ink hover:underline"
          >
            <span>Ir al repositorio completo</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {completedClasses.map((cls) => {
            const myAttendance = cls.attendances.find((a) => a.studentId === user.id);
            return (
              <div
                key={cls.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">{formatDateLong(cls.dateStart)}</span>
                    <StatusPill
                      label={myAttendance ? 'Asististe' : 'No asististe en vivo'}
                      tone={myAttendance ? 'success' : 'neutral'}
                    />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-slate-800">{cls.title}</h3>
                  <p className="mb-3 text-xs text-slate-500">Docente: {cls.mentor.name}</p>
                </div>

                {cls.youtubeUrl ? (
                  <Link
                    href="/estudiante/repositorio"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>Ver video de la clase grabada</span>
                  </Link>
                ) : (
                  <span className="text-[11px] italic text-slate-500">Grabación en proceso</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
