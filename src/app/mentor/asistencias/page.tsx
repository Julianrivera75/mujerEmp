'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { CheckCircle2, Clock, Calendar, Users, Loader2 } from 'lucide-react';

interface MentorAttendanceLog {
  id: string;
  joinedAt: string;
  student: { id: string; name: string; email: string };
  classSession: { id: string; title: string; dateStart: string; meetLink: string | null };
}

export default function MentorAttendancesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<MentorAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [meRes, attRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/admin/attendances'),
        ]);
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const attData = await attRes.json();
        setAttendances(attData.attendances || []);
      } catch (err) {
        console.error('Error cargando asistencias del mentor:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
            <CheckCircle2 className="w-8 h-8 text-teal-600" />
            <span>Asistencia de Estudiantes a mis Clases</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Registro cronológico en vivo de las estudiantes que hacen clic en el link de Google Meet publicado para conectarse a tus sesiones.
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white shadow-xl overflow-hidden p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-teal-50/60 border-b border-teal-100 text-[11px] font-black uppercase tracking-wider text-teal-900">
                  <th className="py-3.5 px-4">Estudiante</th>
                  <th className="py-3.5 px-4">Clase / Sesión</th>
                  <th className="py-3.5 px-4">Fecha y Hora de Clic</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                      <span>Cargando lista de asistencia...</span>
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Aún no hay registros de asistencia a tus clases.
                    </td>
                  </tr>
                ) : (
                  attendances.map((log) => {
                    const clickDate = new Date(log.joinedAt);
                    const formatted = `${clickDate.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })} a las ${clickDate.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`;

                    return (
                      <tr key={log.id} className="hover:bg-teal-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{log.student.name}</p>
                          <p className="text-slate-400 text-[11px]">{log.student.email}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {log.classSession.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 flex items-center space-x-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>{formatted}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Conectada</span>
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
