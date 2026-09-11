'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Calendar as CalendarIcon, 
  PlusCircle, 
  Video, 
  Youtube, 
  Users, 
  Clock, 
  Edit3, 
  Trash2, 
  ExternalLink,
  Loader2,
  X,
  Check,
  FileText
} from 'lucide-react';

interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  meetLink: string | null;
  youtubeUrl: string | null;
  recordingNotes: string | null;
  status: string;
  monthKey: string;
  mentor: { id: string; name: string; email: string };
  enrollments: { student: { id: string; name: string; email: string } }[];
  attendances: { student: { id: string; name: string } }[];
}

interface SimpleUser {
  id: string;
  name: string;
  email: string;
}

export default function AdminClassesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [mentors, setMentors] = useState<SimpleUser[]>([]);
  const [students, setStudents] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro mensual
  const [selectedMonth, setSelectedMonth] = useState('2026-09');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dateStart: '',
    dateEnd: '',
    mentorId: '',
    meetLink: '',
    youtubeUrl: '',
    recordingNotes: '',
    status: 'PROGRAMADA',
    studentIds: [] as string[],
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, classesRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/classes?monthKey=${selectedMonth}`),
        fetch('/api/admin/users'),
      ]);

      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const classesData = await classesRes.json();
      setClasses(classesData.classes || []);

      const usersData = await usersRes.json();
      const allUsers = usersData.users || [];
      setMentors(allUsers.filter((u: any) => u.role === 'MENTOR' && u.status === 'ACTIVO'));
      setStudents(allUsers.filter((u: any) => u.role === 'STUDENT' && u.status === 'ACTIVO'));
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedClassId(null);
    setFormData({
      title: '',
      description: '',
      dateStart: '2026-09-18T15:00',
      dateEnd: '2026-09-18T17:00',
      mentorId: mentors[0]?.id || '',
      meetLink: 'https://meet.google.com/new',
      youtubeUrl: '',
      recordingNotes: '',
      status: 'PROGRAMADA',
      studentIds: students.map((s) => s.id), // Por defecto seleccionar todas las estudiantes activas
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (cls: ClassItem) => {
    setModalMode('edit');
    setSelectedClassId(cls.id);
    setFormData({
      title: cls.title,
      description: cls.description || '',
      dateStart: new Date(cls.dateStart).toISOString().slice(0, 16),
      dateEnd: new Date(cls.dateEnd).toISOString().slice(0, 16),
      mentorId: cls.mentor.id,
      meetLink: cls.meetLink || '',
      youtubeUrl: cls.youtubeUrl || '',
      recordingNotes: cls.recordingNotes || '',
      status: cls.status,
      studentIds: cls.enrollments.map((e) => e.student.id),
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Guardar Clase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const url = '/api/classes';
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      const payload = modalMode === 'create'
        ? formData
        : { ...formData, id: selectedClassId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo guardar la clase.');
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar Clase
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás segura/o de eliminar esta clase programada?')) return;
    try {
      const res = await fetch(`/api/classes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClasses(classes.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Error al eliminar clase:', err);
    }
  };

  // Seleccionar o deseleccionar todas las estudiantes
  const toggleAllStudents = () => {
    if (formData.studentIds.length === students.length) {
      setFormData({ ...formData, studentIds: [] });
    } else {
      setFormData({ ...formData, studentIds: students.map((s) => s.id) });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
              <CalendarIcon className="w-8 h-8 text-purple-600" />
              <span>Programación Mensual de Clases</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Programa las clases virtuales por mes, vincula enlaces de Google Meet y carga las grabaciones de YouTube para los estudiantes.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Programar Nueva Clase</span>
          </button>
        </div>

        {/* Selector de Mes */}
        <div className="glass-card rounded-3xl p-5 border border-white shadow-md mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtrar por Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white border border-purple-200 text-sm font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="2026-08">Agosto 2026</option>
              <option value="2026-09">Septiembre 2026 (Actual)</option>
              <option value="2026-10">Octubre 2026</option>
              <option value="2026-11">Noviembre 2026</option>
              <option value="2026-12">Diciembre 2026</option>
              <option value="ALL">Ver Todas las Clases</option>
            </select>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Total en este periodo: <strong className="text-purple-700">{classes.length} clases</strong>
          </div>
        </div>

        {/* Lista de Clases */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-500" />
            <p className="font-semibold">Cargando clases del mes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-500 border border-white shadow-lg">
            <CalendarIcon className="w-12 h-12 mx-auto text-purple-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No hay clases programadas para este mes</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Haz clic en "Programar Nueva Clase" para crear la primera sesión de capacitación del periodo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classes.map((cls) => {
              const start = new Date(cls.dateStart);
              const end = new Date(cls.dateEnd);
              const formattedDate = start.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });
              const formattedTime = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={cls.id}
                  className="glass-card rounded-3xl p-6 border border-white shadow-lg hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Estado y Fecha */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        cls.status === 'FINALIZADA'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-100 text-emerald-800 animate-pulse'
                      }`}>
                        {cls.status}
                      </span>
                      <span className="text-xs font-semibold text-purple-700 capitalize">
                        {formattedDate}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-800 mb-1">{cls.title}</h2>
                    {cls.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{cls.description}</p>
                    )}

                    <div className="space-y-2 mb-4 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Horario:</span>
                        <span className="font-bold text-slate-700 flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-purple-500" />
                          {formattedTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Docente asignada:</span>
                        <span className="font-bold text-teal-700">{cls.mentor.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Estudiantes citadas:</span>
                        <span className="font-bold text-purple-700">{cls.enrollments.length} alumnas</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Asistencia registrada:</span>
                        <span className="font-bold text-emerald-600">
                          {cls.attendances.length} de {cls.enrollments.length}
                        </span>
                      </div>
                    </div>

                    {/* Enlaces de Google Meet y YouTube */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center text-slate-600 font-semibold">
                          <Video className="w-4 h-4 text-teal-600 mr-1.5" />
                          Google Meet:
                        </span>
                        {cls.meetLink ? (
                          <a
                            href={cls.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-700 hover:text-teal-900 font-bold underline truncate max-w-[200px]"
                          >
                            {cls.meetLink}
                          </a>
                        ) : (
                          <span className="text-amber-600 italic">No configurado</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center text-slate-600 font-semibold">
                          <Youtube className="w-4 h-4 text-red-600 mr-1.5" />
                          Grabación YouTube:
                        </span>
                        {cls.youtubeUrl ? (
                          <a
                            href={cls.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-600 hover:text-red-800 font-bold underline truncate max-w-[200px]"
                          >
                            Ver en YouTube
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Sin grabación cargada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Programar / Editar Clase */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h2 className="text-xl font-black text-slate-800">
                {modalMode === 'create' ? 'Programar Clase Virtual' : 'Editar Datos de Clase'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la Clase / Módulo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Módulo 4: Redes de Apoyo y Liderazgo Digital"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción u Objetivos
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Temas a tratar en esta sesión..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha y Hora Inicio *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha y Hora Fin *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.dateEnd}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mentora Asignada *
                  </label>
                  <select
                    required
                    value={formData.mentorId}
                    onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">Selecciona una mentora...</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado de la Clase
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="PROGRAMADA">PROGRAMADA</option>
                    <option value="FINALIZADA">FINALIZADA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </select>
                </div>
              </div>

              {/* Enlace de Google Meet */}
              <div>
                <label className="block text-xs font-bold text-teal-800 uppercase tracking-wider mb-1 flex items-center">
                  <Video className="w-4 h-4 mr-1 text-teal-600" />
                  <span>Enlace de Google Meet</span>
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  value={formData.meetLink}
                  onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-teal-200 bg-teal-50/40 text-sm text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 Al hacer clic en este enlace, el sistema registrará automáticamente la asistencia de la estudiante.
                </p>
              </div>

              {/* Enlace de YouTube de Clase Grabada */}
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-2">
                <label className="block text-xs font-bold text-red-900 uppercase tracking-wider flex items-center">
                  <Youtube className="w-4 h-4 mr-1 text-red-600" />
                  <span>Link de YouTube de la Clase Grabada (Para Repositorio)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-red-200 text-xs text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                />
                <input
                  type="text"
                  placeholder="Notas u observaciones de la grabación..."
                  value={formData.recordingNotes}
                  onChange={(e) => setFormData({ ...formData, recordingNotes: e.target.value })}
                  className="w-full px-3.5 py-1.5 rounded-xl border border-red-200 text-xs text-slate-700 bg-white"
                />
              </div>

              {/* Asignación de Estudiantes con Checkbox */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estudiantes Asignadas a esta Clase ({formData.studentIds.length} seleccionadas)
                  </label>
                  <button
                    type="button"
                    onClick={toggleAllStudents}
                    className="text-xs text-purple-700 font-bold hover:underline"
                  >
                    {formData.studentIds.length === students.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 divide-y divide-slate-100 bg-white">
                  {students.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">No hay estudiantes activas registradas.</p>
                  ) : (
                    students.map((st) => {
                      const checked = formData.studentIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className="flex items-center justify-between py-2 px-2 hover:bg-purple-50/50 rounded-xl cursor-pointer text-xs"
                        >
                          <span className="font-semibold text-slate-800">{st.name} ({st.email})</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  studentIds: formData.studentIds.filter((id) => id !== st.id),
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  studentIds: [...formData.studentIds, st.id],
                                });
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Crear Clase' : 'Actualizar Clase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
