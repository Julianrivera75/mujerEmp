import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Calendar, CheckCircle2, PlusCircle, Video, ExternalLink, BookOpen, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const monthKey = format(new Date(), 'yyyy-MM');
  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  const [totalStudents, totalMentors, activeUsers, inactiveUsers, currentMonthClasses, totalAttendances] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'MENTOR' } }),
    prisma.user.count({ where: { status: 'ACTIVO' } }),
    prisma.user.count({ where: { status: 'INACTIVO' } }),
    prisma.classSession.findMany({
      where: { monthKey },
      include: {
        mentor: { select: { name: true } },
        attendances: true,
        enrollments: true,
      },
      orderBy: { dateStart: 'asc' },
    }),
    prisma.attendance.count(),
  ]);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner de bienvenida */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-role-from via-purple-700 to-role-to p-8 sm:p-10 text-white shadow-lift">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
              Panel de administración general
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Hola, {user?.name}</h1>
            <p className="mt-2 text-purple-100 text-sm sm:text-base max-w-xl">
              Supervisa el crecimiento de la comunidad, gestiona usuarios activos e inactivos, programa las clases del mes y valida la asistencia virtual.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/admin/usuarios" variant="secondary" leftIcon={<PlusCircle className="w-4 h-4 text-role-accent" />} className="!bg-white !text-purple-900 hover:!bg-purple-50 border-none">
              Crear usuario
            </Button>
            <Button href="/admin/clases" variant="secondary" leftIcon={<Calendar className="w-4 h-4" />} className="!bg-white/20 !text-white border-white/20 hover:!bg-white/30">
              Programar clase
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estudiantes</span>
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
              <Users className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="font-display tabular-nums text-3xl font-bold text-slate-800 mt-3">{totalStudents}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="font-semibold text-emerald-600 flex items-center">
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              {activeUsers} activos
            </span>
            <span>·</span>
            <span className="font-semibold text-red-500 flex items-center">
              <UserX className="w-3.5 h-3.5 mr-1" />
              {inactiveUsers} inactivos
            </span>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mentoras</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="font-display tabular-nums text-3xl font-bold text-slate-800 mt-3">{totalMentors}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Asignadas a módulos de liderazgo</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clases del mes</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="font-display tabular-nums text-3xl font-bold text-slate-800 mt-3">{currentMonthClasses.length}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium capitalize">{monthLabel}</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Asistencias clic</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="font-display tabular-nums text-3xl font-bold text-slate-800 mt-3">{totalAttendances}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Registros vía Google Meet</p>
        </Card>
      </div>

      {/* Cronograma del mes */}
      <Card variant="glass" className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2 capitalize">
              <Calendar className="w-5 h-5 text-role-accent" />
              <span>Cronograma de clases · {monthLabel}</span>
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Supervisa el estado de cada sesión, enlaces de Google Meet y grabaciones en YouTube.
            </p>
          </div>
          <Button href="/admin/clases" variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
            Gestionar y programar
          </Button>
        </div>

        {currentMonthClasses.length === 0 ? (
          <EmptyState icon={Calendar} title="Sin clases programadas este mes" description="Programa la primera clase para que aparezca aquí." />
        ) : (
          <div className="space-y-4">
            {currentMonthClasses.map((cls) => {
              const dateStart = new Date(cls.dateStart);
              const dateEnd = new Date(cls.dateEnd);
              const formattedDate = dateStart.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
              const formattedTime = `${dateStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${dateEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={cls.id}
                  className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-role-accent/30 transition-all shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <StatusPill
                        label={cls.status}
                        tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'}
                        pulse={cls.status !== 'FINALIZADA'}
                      />
                      <span className="text-xs font-semibold text-slate-500 capitalize">{formattedDate} · {formattedTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{cls.title}</h3>
                    <p className="text-xs text-slate-500">
                      Docente: <strong className="text-slate-700">{cls.mentor.name}</strong> · Inscritas: <strong className="text-role-accent">{cls.enrollments.length}</strong> · Asistieron: <strong className="text-emerald-700">{cls.attendances.length}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {cls.meetLink && (
                      <Link
                        href={cls.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Google Meet</span>
                      </Link>
                    )}
                    {cls.youtubeUrl ? (
                      <StatusPill label="Grabación lista" tone="danger" />
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sin grabación aún</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
