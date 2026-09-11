'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  CheckCircle2, 
  Users, 
  Calendar, 
  Clock, 
  Search, 
  ExternalLink,
  Award,
  Loader2,
  Video,
  Download
} from 'lucide-react';

interface AttendanceLog {
  id: string;
  joinedAt: string;
  student: { id: string; name: string; email: string; documentId: string | null };
  classSession: {
    id: string;
    title: string;
    dateStart: string;
    meetLink: string | null;
    mentor: { id: string; name: string };
  };
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  totalEnrolled: number;
  totalAttended: number;
  percentage: number;
}

export default function AdminAttendancePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<AttendanceLog[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
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
      setStudentSummary(attData.studentSummary || []);
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = attendances.filter((att) => {
    const q = search.toLowerCase();
    return (
      att.student.name.toLowerCase().includes(q) ||
      att.student.email.toLowerCase().includes(q) ||
      att.classSession.title.toLowerCase().includes(q)
    );
  });

  const exportToCsv = () => {
    if (filteredLogs.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const headers = ['Estudiante', 'Documento', 'Correo', 'Clase / Sesión', 'Docente', 'Fecha', 'Hora', 'Estado'];
    const rows = filteredLogs.map((log) => {
      const d = new Date(log.joinedAt);
      const dateStr = d.toLocaleDateString('es-ES');
      const timeStr = d.toLocaleTimeString('es-ES');
      return [
        `"${log.student.name.replace(/"/g, '""')}"`,
        `"${(log.student.documentId || 'N/A').replace(/"/g, '""')}"`,
        `"${log.student.email.replace(/"/g, '""')}"`,
        `"${log.classSession.title.replace(/"/g, '""')}"`,
        `"${log.classSession.mentor.name.replace(/"/g, '""')}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        '"PRESENTE"',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_asistencias_empoderas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <span>Control y Reporte de Asistencias</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Visualiza en tiempo real el registro automático de asistencia generado cada vez que una estudiante hace clic en el enlace de Google Meet.
            </p>
          </div>
          <button
            onClick={exportToCsv}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Reporte (CSV / Excel)</span>
          </button>
        </div>

        {/* Resumen de Participación por Estudiante */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-purple-600" />
            <span>Porcentaje de Asistencia por Estudiante</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentSummary.map((st) => (
              <div
                key={st.id}
                className="glass-card rounded-2xl p-5 border border-white shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-sm">{st.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      st.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {st.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{st.email}</p>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        st.percentage >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : st.percentage >= 50
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-pink-500 to-rose-500'
                      }`}
                      style={{ width: `${Math.min(st.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>Asistió a <strong>{st.totalAttended}</strong> de {st.totalEnrolled} clases</span>
                  <span className="font-black text-purple-700 text-sm">{st.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Registro Detallado con Búsqueda */}
        <div className="glass-card rounded-3xl border border-white shadow-xl overflow-hidden p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Historial Detallado de Ingresos a Google Meet
              </h2>
              <p className="text-xs text-slate-500">
                Fecha y hora exacta en la que cada estudiante dio clic para unirse a la sesión.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por alumna o clase..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-100 text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  <th className="py-3.5 px-4">Estudiante</th>
                  <th className="py-3.5 px-4">Clase / Módulo</th>
                  <th className="py-3.5 px-4">Docente</th>
                  <th className="py-3.5 px-4">Fecha y Hora de Clic</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                      <span>Cargando registros...</span>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No se encontraron registros de asistencia.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const clickDate = new Date(log.joinedAt);
                    const formatted = `${clickDate.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })} a las ${clickDate.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{log.student.name}</p>
                          <p className="text-slate-400 text-[11px]">{log.student.email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-700">{log.classSession.title}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {log.classSession.mentor.name}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 flex items-center space-x-1.5">
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
