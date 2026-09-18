'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, Calendar, Clock, CheckCircle2, BookOpen, ClipboardList, ChevronRight, Youtube, Award } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSessionUser } from '@/lib/user-context';
import JoinMeetButton from '@/components/JoinMeetButton';

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
      console.error('Error cargando datos del estudiante:', err);
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
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-role-from via-purple-600 to-role-to p-8 sm:p-10 text-white shadow-lift">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
              Tu espacio de formación
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Bienvenida, {user.name.split(' ')[0]}</h1>
            <p className="mt-2 text-purple-100 text-sm sm:text-base max-w-xl">
              Conéctate a tus clases en Google Meet con un clic. Tu asistencia se registra de inmediato para tu certificado.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/estudiante/repositorio" variant="secondary" leftIcon={<Youtube className="w-4 h-4 text-red-600" />} className="!bg-white !text-purple-900 border-none">
              Clases grabadas
            </Button>
            <Button href="/estudiante/tareas" variant="secondary" leftIcon={<ClipboardList className="w-4 h-4" />} className="!bg-white/20 !text-white border-white/20">
              Mis tareas
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Clases del programa</p>
            <p className="font-display tabular-nums text-2xl font-bold text-slate-800">{classes.length}</p>
          </div>
        </Card>
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Asistencias confirmadas</p>
            <p className="font-display tabular-nums text-2xl font-bold text-slate-800">{totalAttended}</p>
          </div>
        </Card>
        <Card variant="glass" className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <Youtube className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Grabaciones disponibles</p>
            <p className="font-display tabular-nums text-2xl font-bold text-slate-800">{classes.filter((c) => c.youtubeUrl).length}</p>
          </div>
        </Card>
      </div>

      {classes.length > 0 && (
        <Card variant="tinted" className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-role-from text-white flex items-center justify-center shadow-soft">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Tu progreso hacia la certificación</h2>
                <p className="text-xs text-slate-500">Basado en tu asistencia a las sesiones en vivo vía Google Meet.</p>
              </div>
            </div>
            <span className="text-lg font-black text-role-accent self-start sm:self-auto">{progressPct}% cumplido</span>
          </div>

          <ProgressBar value={progressPct} className="mb-3 h-3" />

          <div className="flex justify-end">
            <Button href="/estudiante/certificado" variant="secondary" size="sm" leftIcon={<Award className="w-4 h-4" />}>
              Ver mi certificado
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2.5 mb-1">
          <Video className="w-5 h-5 text-role-accent" />
          <span>Tus próximas clases virtuales</span>
        </h2>
        <p className="text-slate-500 text-xs mb-6">Al dar clic en el botón de Google Meet se marcará tu asistencia automáticamente antes de abrir la sala virtual.</p>

        {loading ? (
          <SkeletonCard />
        ) : upcomingClasses.length === 0 ? (
          <Card variant="glass" className="p-0">
            <EmptyState icon={Calendar} title="No tienes clases próximas pendientes" description="Revisa el repositorio para ver clases grabadas de sesiones anteriores." />
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingClasses.map((cls, i) => {
              const start = new Date(cls.dateStart);
              const end = new Date(cls.dateEnd);
              const formattedDate = start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
              const formattedTime = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
              const myAttendance = cls.attendances.find((a) => a.studentId === user.id);

              return (
                <Card key={cls.id} variant="glass" className={i === 0 ? 'p-6 sm:p-8 border-role-accent/20 shadow-lift' : 'p-6 sm:p-8'}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {i === 0 && <StatusPill label="Próxima clase" tone="info" />}
                        <StatusPill label={cls.status} tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'} />
                        <span className="text-xs font-bold text-role-accent capitalize">{formattedDate}</span>
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5" />
                          {formattedTime}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-800">{cls.title}</h3>
                      {cls.description && <p className="text-xs text-slate-600 leading-relaxed">{cls.description}</p>}
                      <p className="text-xs text-slate-500">
                        Mentora: <strong className="text-teal-700">{cls.mentor.name}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-3">
                      <JoinMeetButton
                        classId={cls.id}
                        meetLink={cls.meetLink}
                        alreadyAttended={Boolean(myAttendance)}
                        attendedAt={myAttendance?.joinedAt}
                        onAttendanceSuccess={loadData}
                      />
                      {cls.youtubeUrl && (
                        <Link href="/estudiante/repositorio" className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors">
                          <Youtube className="w-3.5 h-3.5" />
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-role-accent" />
            <span>Clases que ya viste o cursaste</span>
          </h2>
          <Link href="/estudiante/repositorio" className="text-xs font-bold text-role-accent hover:underline flex items-center gap-1">
            <span>Ir al repositorio completo</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completedClasses.map((cls) => {
            const myAttendance = cls.attendances.find((a) => a.studentId === user.id);
            return (
              <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(cls.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <StatusPill label={myAttendance ? 'Asististe' : 'No asististe en vivo'} tone={myAttendance ? 'success' : 'neutral'} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">{cls.title}</h3>
                  <p className="text-xs text-slate-500 mb-3">Docente: {cls.mentor.name}</p>
                </div>

                {cls.youtubeUrl ? (
                  <Link href="/estudiante/repositorio" className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700">
                    <Youtube className="w-4 h-4" />
                    <span>Ver video de la clase grabada</span>
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Grabación en proceso</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
