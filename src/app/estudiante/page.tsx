'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import JoinMeetButton from '@/components/JoinMeetButton';
import { 
  Video, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  ClipboardList, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  Youtube,
  Award
} from 'lucide-react';
import Link from 'next/link';

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, classesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/classes'),
      ]);

      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const classesData = await classesRes.json();
      setClasses(classesData.classes || []);
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

  // Próximas clases (fechas futuras o programadas)
  const upcomingClasses = classes.filter((c) => c.status !== 'FINALIZADA');

  // Clases ya vistas o finalizadas
  const completedClasses = classes.filter((c) => c.status === 'FINALIZADA' || new Date(c.dateEnd) < now);

  const totalAttended = classes.filter((c) =>
    c.attendances.some((a) => a.studentId === currentUser?.id)
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Bienvenida Vibrante */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 p-8 sm:p-10 text-white shadow-2xl mb-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Tu Espacio de Formación</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-black">
                ¡Bienvenida, {currentUser?.name?.split(' ')[0] || 'Estudiante'}! 💜
              </h1>
              <p className="mt-2 text-purple-100 text-sm sm:text-base max-w-xl">
                Conéctate a tus clases en Google Meet con un solo clic. Tu asistencia se registrará de inmediato para tu certificado.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/estudiante/repositorio"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-purple-900 font-bold text-sm hover:bg-purple-50 transition-all shadow-lg transform hover:-translate-y-0.5"
              >
                <Youtube className="w-4 h-4 text-red-600" />
                <span>Ver Clases Grabadas</span>
              </Link>
              <Link
                href="/estudiante/tareas"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-purple-500/30 backdrop-blur-md text-white font-bold text-sm hover:bg-purple-500/50 border border-white/20 transition-all transform hover:-translate-y-0.5"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Mis Tareas</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Resumen de Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-3xl p-5 border border-white shadow-md flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Clases del Programa</p>
              <p className="text-2xl font-black text-slate-800">{classes.length}</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white shadow-md flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Asistencias Confirmadas</p>
              <p className="text-2xl font-black text-slate-800">{totalAttended}</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white shadow-md flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Grabaciones Disponibles</p>
              <p className="text-2xl font-black text-slate-800">
                {classes.filter((c) => c.youtubeUrl).length}
              </p>
            </div>
          </div>
        </div>

        {/* Progreso hacia la Certificación */}
        {classes.length > 0 && (
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-purple-200/80 shadow-lg mb-8 bg-gradient-to-r from-purple-50/80 via-fuchsia-50/50 to-pink-50/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Tu Progreso hacia la Certificación de Empoderas Diversas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Requiere al menos un 80% de asistencia a las sesiones en vivo vía Google Meet.
                  </p>
                </div>
              </div>
              <span className="text-lg font-black text-purple-700 self-start sm:self-auto">
                {Math.round((totalAttended / classes.length) * 100)}% Cumplido
              </span>
            </div>

            <div className="w-full bg-purple-100/70 h-3 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(Math.round((totalAttended / classes.length) * 100), 100)}%` }}
              />
            </div>

            <div className="flex justify-end">
              <Link
                href="/estudiante/certificado"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-4 py-2 rounded-xl border border-purple-200 transition-colors shadow-sm"
              >
                <Award className="w-4 h-4 text-purple-600" />
                <span>Ver / Descargar mi Certificado Oficial</span>
              </Link>
            </div>
          </div>
        )}

        {/* Próximas Clases con Botón Google Meet */}
        <div className="mb-10">
          <h2 className="text-2xl font-black text-slate-800 flex items-center space-x-2.5 mb-2">
            <Video className="w-6 h-6 text-fuchsia-600" />
            <span>Tus Próximas Clases Virtuales</span>
          </h2>
          <p className="text-slate-500 text-xs mb-6">
            Al dar clic en el botón de Google Meet se marcará tu asistencia automáticamente antes de abrir la sala virtual.
          </p>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-fuchsia-600" />
              <p>Cargando tus clases...</p>
            </div>
          ) : upcomingClasses.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center text-slate-500 border border-white">
              <Calendar className="w-10 h-10 mx-auto text-purple-300 mb-2" />
              <p className="font-bold text-slate-700">No tienes clases próximas pendientes.</p>
              <p className="text-xs text-slate-400 mt-1">Revisa el repositorio para ver clases grabadas de sesiones anteriores.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingClasses.map((cls) => {
                const start = new Date(cls.dateStart);
                const end = new Date(cls.dateEnd);
                const formattedDate = start.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                });
                const formattedTime = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                const myAttendance = cls.attendances.find((a) => a.studentId === currentUser?.id);
                const alreadyAttended = !!myAttendance;

                return (
                  <div
                    key={cls.id}
                    className="glass-card rounded-3xl p-6 sm:p-8 border border-white shadow-xl hover:shadow-2xl transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-100 text-fuchsia-800">
                            {cls.status}
                          </span>
                          <span className="text-xs font-bold text-purple-700 capitalize flex items-center">
                            📅 {formattedDate}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center bg-slate-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {formattedTime}
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-slate-800">{cls.title}</h3>
                        {cls.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">{cls.description}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          Mentora: <strong className="text-teal-700">{cls.mentor.name}</strong>
                        </p>
                      </div>

                      {/* Botón Google Meet con Asistencia Automática */}
                      <div className="flex flex-col items-start lg:items-end gap-3">
                        <JoinMeetButton
                          classId={cls.id}
                          meetLink={cls.meetLink}
                          alreadyAttended={alreadyAttended}
                          attendedAt={myAttendance?.joinedAt}
                          onAttendanceSuccess={loadData}
                        />

                        {cls.youtubeUrl && (
                          <Link
                            href="/estudiante/repositorio"
                            className="inline-flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            <span>Ver grabación en repositorio</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sección de Clases Ya Vistas / Repositorio Rápido */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>Clases que ya viste o cursaste</span>
            </h2>
            <Link
              href="/estudiante/repositorio"
              className="text-xs font-bold text-purple-700 hover:underline flex items-center space-x-1"
            >
              <span>Ir al repositorio completo</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedClasses.map((cls) => {
              const myAttendance = cls.attendances.find((a) => a.studentId === currentUser?.id);

              return (
                <div
                  key={cls.id}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(cls.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {myAttendance ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Asististe</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          No asististe en vivo
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{cls.title}</h3>
                    <p className="text-xs text-slate-500 mb-3">Docente: {cls.mentor.name}</p>
                  </div>

                  {cls.youtubeUrl ? (
                    <Link
                      href="/estudiante/repositorio"
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                    >
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
      </main>
    </div>
  );
}
