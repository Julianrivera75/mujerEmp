'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { CheckCircle2, Clock, Calendar, Video, Award, Loader2 } from 'lucide-react';

interface AttendanceItem {
  id: string;
  joinedAt: string;
  classSession: {
    id: string;
    title: string;
    dateStart: string;
    meetLink: string | null;
    mentor: { name: string };
  };
}

export default function StudentAttendanceHistoryPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [meRes, attRes, classesRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/admin/attendances'),
          fetch('/api/classes'),
        ]);

        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const classesData = await classesRes.json();
        const myClasses = classesData.classes || [];
        setTotalClasses(myClasses.length);

        const attData = await attRes.json();
        const allAtt: AttendanceItem[] = attData.attendances || [];
        // Filtrar solo las asistencias de esta estudiante
        const myAtt = allAtt.filter((a: any) => a.student.id === meData.user?.id);
        setAttendances(myAtt);
      } catch (err) {
        console.error('Error cargando asistencias:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const percentage = totalClasses > 0 ? Math.round((attendances.length / totalClasses) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <span>Mi Historial de Asistencia Virtual</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cada vez que haces clic en el enlace de Google Meet para conectarte a tu clase, el sistema registra automáticamente tu asistencia.
          </p>
        </div>

        {/* Resumen de Asistencia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Clases Asistidas</p>
              <p className="text-2xl font-black text-slate-800">{attendances.length}</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Total Clases Programadas</p>
              <p className="text-2xl font-black text-slate-800">{totalClasses}</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white shadow-lg flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Porcentaje de Participación</p>
              <p className="text-2xl font-black text-emerald-600">{percentage}%</p>
            </div>
          </div>
        </div>

        {/* Tabla de Asistencias */}
        <div className="glass-card rounded-3xl border border-white shadow-xl overflow-hidden p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Detalle de Clases Conectadas en Google Meet
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/70 border-b border-purple-100 text-[11px] font-black uppercase tracking-wider text-purple-900">
                  <th className="py-3.5 px-4">Clase / Sesión</th>
                  <th className="py-3.5 px-4">Docente</th>
                  <th className="py-3.5 px-4">Fecha y Hora de Clic</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      <span>Cargando tus asistencias...</span>
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Aún no has registrado asistencias a clases virtuales. Conéctate a tus próximas clases para marcar tu presencia.
                    </td>
                  </tr>
                ) : (
                  attendances.map((item) => {
                    const clickDate = new Date(item.joinedAt);
                    const formatted = `${clickDate.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                    })} a las ${clickDate.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`;

                    return (
                      <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {item.classSession.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {item.classSession.mentor.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 flex items-center space-x-1.5 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatted}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Presente</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
