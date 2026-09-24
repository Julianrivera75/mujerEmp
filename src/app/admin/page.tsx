import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Video,
  ExternalLink,
  BookOpen,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { safeHref } from '@/lib/validators';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const monthKey = format(new Date(), 'yyyy-MM');
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: es });

  const [totalStudents, totalMentors, activeUsers, inactiveUsers, currentMonthClasses, totalAttendances] =
    await Promise.all([
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
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner de bienvenida */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-role-from via-purple-700 to-role-to p-8 text-white shadow-lift sm:p-10">
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              Panel de administración general
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Hola, {user?.name}</h1>
            <p className="mt-2 max-w-xl text-sm text-purple-100 sm:text-base">
              Supervisa el crecimiento de la comunidad, gestiona usuarios activos e inactivos, programa las clases del
              mes y valida la asistencia virtual.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              href="/admin/usuarios"
              variant="secondary"
              leftIcon={<PlusCircle className="h-4 w-4 text-role-accent" />}
              className="border-none !bg-white !text-purple-900 hover:!bg-purple-50"
            >
              Crear usuario
            </Button>
            <Button
              href="/admin/clases"
              variant="secondary"
              leftIcon={<Calendar className="h-4 w-4" />}
              className="border-white/20 !bg-white/20 !text-white hover:!bg-white/30"
            >
              Programar clase
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estudiantes</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600">
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-slate-800">{totalStudents}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="flex items-center font-semibold text-emerald-600">
              <UserCheck className="mr-1 h-3.5 w-3.5" />
              {activeUsers} activos
            </span>
            <span>·</span>
            <span className="flex items-center font-semibold text-red-500">
              <UserX className="mr-1 h-3.5 w-3.5" />
              {inactiveUsers} inactivos
            </span>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mentoras</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
              <BookOpen className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-slate-800">{totalMentors}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Asignadas a módulos de liderazgo</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clases del mes</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
              <Calendar className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-slate-800">
            {currentMonthClasses.length}
          </p>
          <p className="mt-2 text-xs font-medium capitalize text-slate-500">{monthLabel}</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Asistencias clic</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-slate-800">{totalAttendances}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Registros vía Google Meet</p>
        </Card>
      </div>

      {/* Cronograma del mes */}
      <Card variant="glass" className="p-6 sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold capitalize text-slate-800">
              <Calendar className="h-5 w-5 text-role-accent" />
              <span>Cronograma de clases · {monthLabel}</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Supervisa el estado de cada sesión, enlaces de Google Meet y grabaciones en YouTube.
            </p>
          </div>
          <Button href="/admin/clases" variant="ghost" size="sm" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
            Gestionar y programar
          </Button>
        </div>

        {currentMonthClasses.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin clases programadas este mes"
            description="Programa la primera clase para que aparezca aquí."
          />
        ) : (
          <div className="space-y-4">
            {currentMonthClasses.map((cls) => {
              const dateStart = new Date(cls.dateStart);
              const dateEnd = new Date(cls.dateEnd);
              const formattedDate = dateStart.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });
              const formattedTime = `${dateStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${dateEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={cls.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition-all hover:border-role-accent/30 lg:flex-row lg:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <StatusPill
                        label={cls.status}
                        tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'}
                        pulse={cls.status !== 'FINALIZADA'}
                      />
                      <span className="text-xs font-semibold capitalize text-slate-500">
                        {formattedDate} · {formattedTime}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{cls.title}</h3>
                    <p className="text-xs text-slate-500">
                      Docente: <strong className="text-slate-700">{cls.mentor.name}</strong> · Inscritas:{' '}
                      <strong className="text-role-accent">{cls.enrollments.length}</strong> · Asistieron:{' '}
                      <strong className="text-emerald-700">{cls.attendances.length}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {cls.meetLink && (
                      <Link
                        href={safeHref(cls.meetLink) ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Google Meet</span>
                      </Link>
                    )}
                    {cls.youtubeUrl ? (
                      <StatusPill label="Grabación lista" tone="danger" />
                    ) : (
                      <span className="text-[11px] italic text-slate-400">Sin grabación aún</span>
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
