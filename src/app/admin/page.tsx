import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  PlusCircle, 
  Video, 
  ExternalLink,
  BookOpen,
  TrendingUp,
  UserCheck,
  UserX
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Métricas para el dashboard
  const [totalStudents, totalMentors, activeUsers, inactiveUsers, currentMonthClasses, totalAttendances] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'MENTOR' } }),
    prisma.user.count({ where: { status: 'ACTIVO' } }),
    prisma.user.count({ where: { status: 'INACTIVO' } }),
    prisma.classSession.findMany({
      where: { monthKey: '2026-09' },
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
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Bienvenida Animado */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-indigo-800 p-8 sm:p-10 text-white shadow-2xl mb-8">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
                Panel de Administración General
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                ¡Hola, {user.name}! 🌟
              </h1>
              <p className="mt-2 text-purple-100 text-sm sm:text-base max-w-xl">
                Supervisa el crecimiento de la comunidad, gestiona usuarios activos/inactivos, programa las clases del mes y valida la asistencia virtual.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/usuarios"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-purple-900 font-bold text-sm hover:bg-purple-50 transition-all shadow-lg transform hover:-translate-y-0.5"
              >
                <PlusCircle className="w-4 h-4 text-purple-600" />
                <span>Crear Usuario</span>
              </Link>
              <Link
                href="/admin/clases"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-purple-500/40 backdrop-blur-md text-white font-bold text-sm hover:bg-purple-500/60 border border-white/20 transition-all transform hover:-translate-y-0.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Programar Clase</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tarjetas de Métricas Clave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estudiantes</span>
              <div className="w-10 h-10 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 mt-3">{totalStudents}</p>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-2">
              <span className="font-semibold text-emerald-600 flex items-center">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                {activeUsers} activos
              </span>
              <span>•</span>
              <span className="font-semibold text-red-500 flex items-center">
                <UserX className="w-3.5 h-3.5 mr-1" />
                {inactiveUsers} inactivos
              </span>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mentoras</span>
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 mt-3">{totalMentors}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Asignadas a módulos de liderazgo</p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Clases del Mes</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 mt-3">{currentMonthClasses.length}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Septiembre 2026</p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Asistencias Clic</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 mt-3">{totalAttendances}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">Registros vía Google Meet</p>
          </div>
        </div>

        {/* Clases Programadas del Mes con Estado y Enlaces */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>Cronograma de Clases del Mes (Septiembre 2026)</span>
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Supervisa el estado de cada sesión, links de Google Meet y enlaces de YouTube para repasar.
              </p>
            </div>
            <Link
              href="/admin/clases"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-colors self-start sm:self-auto"
            >
              <span>Gestionar y Programar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

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
                  className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-purple-200 transition-all shadow-sm hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        cls.status === 'FINALIZADA'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-100 text-emerald-700 animate-pulse'
                      }`}>
                        {cls.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 capitalize">
                        📅 {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800">{cls.title}</h3>
                    <p className="text-xs text-slate-500">
                      Docente: <strong className="text-slate-700">{cls.mentor.name}</strong> • Alumnas inscritas: <strong className="text-purple-700">{cls.enrollments.length}</strong> • Asistieron: <strong className="text-emerald-700">{cls.attendances.length}</strong>
                    </p>
                  </div>

                  {/* Acciones y Enlaces */}
                  <div className="flex flex-wrap items-center gap-2">
                    {cls.meetLink && (
                      <a
                        href={cls.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors"
                      >
                        <Video className="w-3.5 h-3.5 text-teal-600" />
                        <span>Google Meet</span>
                      </a>
                    )}
                    {cls.youtubeUrl ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Grabación en YouTube lista</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sin grabación aún</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
