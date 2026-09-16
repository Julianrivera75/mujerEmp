'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import FileUpload from '@/components/FileUpload';
import FileLink from '@/components/FileLink';
import {
  Calendar,
  Video,
  Youtube,
  Users,
  Clock,
  CheckCircle2,
  Edit,
  Save,
  ExternalLink,
  PlusCircle,
  Loader2,
  BookOpen,
  FileText,
  Trash2,
  X
} from 'lucide-react';

interface MentorClass {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  meetLink: string | null;
  youtubeUrl: string | null;
  recordingNotes: string | null;
  status: string;
  enrollments: { student: { id: string; name: string; email: string; documentId: string | null } }[];
  attendances: { studentId: string; joinedAt: string; student: { name: string } }[];
  assignments: { id: string; title: string; dueDate: string }[];
  resources: { id: string; title: string; type: string; url: string }[];
}

export default function MentorDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<MentorClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para editar Meet Link o YouTube link
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editMeetLink, setEditMeetLink] = useState('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal para ver estudiantes asignadas y quién asistió
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<MentorClass | null>(null);

  // Modal para gestionar recursos/materiales de una clase
  const [selectedClassForResources, setSelectedClassForResources] = useState<MentorClass | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceLink, setResourceLink] = useState('');
  const [uploadedResourceKey, setUploadedResourceKey] = useState<string | null>(null);
  const [uploadedResourceType, setUploadedResourceType] = useState<'PDF' | 'IMAGE' | null>(null);
  const [savingResource, setSavingResource] = useState(false);

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
      console.error('Error cargando datos del mentor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartEdit = (cls: MentorClass) => {
    setEditingClassId(cls.id);
    setEditMeetLink(cls.meetLink || '');
    setEditYoutubeUrl(cls.youtubeUrl || '');
    setEditNotes(cls.recordingNotes || '');
  };

  const handleSaveLinks = async (classId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: classId,
          meetLink: editMeetLink,
          youtubeUrl: editYoutubeUrl,
          recordingNotes: editNotes,
        }),
      });

      if (res.ok) {
        setClasses(
          classes.map((c) =>
            c.id === classId
              ? {
                  ...c,
                  meetLink: editMeetLink || null,
                  youtubeUrl: editYoutubeUrl || null,
                  recordingNotes: editNotes || null,
                }
              : c
          )
        );
        setEditingClassId(null);
      }
    } catch (err) {
      console.error('Error guardando enlaces:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetResourceForm = () => {
    setResourceTitle('');
    setResourceLink('');
    setUploadedResourceKey(null);
    setUploadedResourceType(null);
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForResources) return;

    setSavingResource(true);
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          uploadedResourceKey
            ? { classId: selectedClassForResources.id, title: resourceTitle, type: 'DOCUMENT', url: uploadedResourceKey }
            : { classId: selectedClassForResources.id, title: resourceTitle, type: 'LINK', url: resourceLink },
        ),
      });

      const data = await res.json();
      if (res.ok) {
        const updated = { ...selectedClassForResources, resources: [...selectedClassForResources.resources, data.resource] };
        setSelectedClassForResources(updated);
        setClasses(classes.map((c) => (c.id === updated.id ? updated : c)));
        resetResourceForm();
      }
    } catch (err) {
      console.error('Error al agregar recurso:', err);
    } finally {
      setSavingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!selectedClassForResources) return;
    if (!confirm('¿Eliminar este recurso de la clase?')) return;

    try {
      const res = await fetch(`/api/resources?id=${resourceId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = {
          ...selectedClassForResources,
          resources: selectedClassForResources.resources.filter((r) => r.id !== resourceId),
        };
        setSelectedClassForResources(updated);
        setClasses(classes.map((c) => (c.id === updated.id ? updated : c)));
      }
    } catch (err) {
      console.error('Error al eliminar recurso:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Docente */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 p-8 text-white shadow-2xl mb-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
                Espacio de Mentoría & Docencia
              </span>
              <h1 className="text-3xl font-black">
                Bienvenida, {currentUser?.name || 'Mentora'} 👋
              </h1>
              <p className="mt-2 text-teal-100 text-sm max-w-xl">
                Aquí puedes gestionar tus clases programadas por la administración, publicar el enlace de Google Meet para tus alumnas, verificar quién asistió y compartir las grabaciones de YouTube.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/mentor/tareas"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-teal-900 font-bold text-sm hover:bg-teal-50 transition-all shadow-lg"
              >
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Calificar Tareas</span>
              </a>
            </div>
          </div>
        </div>

        {/* Listado de Clases Asignadas */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-teal-600" />
              <span>Mis Clases & Horario Programado</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Programadas por el Administrador. Puedes publicar o actualizar el link de Google Meet y YouTube de cada una.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
            <p>Cargando tus clases asignadas...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-500 border border-white">
            <Calendar className="w-12 h-12 mx-auto text-teal-300 mb-2" />
            <p className="font-bold text-slate-700">No tienes clases asignadas por el momento.</p>
            <p className="text-xs text-slate-400 mt-1">El administrador te asignará sesiones en el calendario mensual.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {classes.map((cls) => {
              const start = new Date(cls.dateStart);
              const end = new Date(cls.dateEnd);
              const formattedDate = start.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
              const formattedTime = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

              const isEditing = editingClassId === cls.id;
              const attendedCount = cls.attendances.length;
              const totalEnrolled = cls.enrollments.length;

              return (
                <div
                  key={cls.id}
                  className="glass-card rounded-3xl p-6 sm:p-8 border border-white shadow-xl transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                          {cls.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 capitalize">
                          📅 {formattedDate}
                        </span>
                        <span className="text-xs font-bold text-teal-700 flex items-center bg-teal-50 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {formattedTime}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-800">{cls.title}</h3>
                      {cls.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{cls.description}</p>
                      )}

                      {/* Asistencia y Estudiantes Asignadas */}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <button
                          onClick={() => setSelectedClassForStudents(cls)}
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl transition-colors"
                        >
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>Ver Estudiantes Asignadas ({totalEnrolled})</span>
                        </button>

                        <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Asistieron al Google Meet: {attendedCount} de {totalEnrolled}</span>
                        </div>

                        <button
                          onClick={() => setSelectedClassForResources(cls)}
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors"
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>Materiales de Clase ({cls.resources.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Enlaces de Google Meet y YouTube */}
                    <div className="w-full lg:w-96 bg-white/80 p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                      {!isEditing ? (
                        <>
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                              Enlace de Google Meet para Alumnas:
                            </span>
                            {cls.meetLink ? (
                              <div className="flex items-center justify-between p-2.5 bg-teal-50 rounded-xl text-xs font-bold text-teal-900 border border-teal-200">
                                <span className="truncate max-w-[200px]">{cls.meetLink}</span>
                                <a
                                  href={cls.meetLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-teal-700 hover:text-teal-900 ml-2"
                                  title="Abrir sala"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-amber-600 italic">
                                No has publicado el link de Meet para esta clase.
                              </p>
                            )}
                          </div>

                          <div className="space-y-1 pt-1 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                              Grabación de YouTube:
                            </span>
                            {cls.youtubeUrl ? (
                              <a
                                href={cls.youtubeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-red-600 hover:underline flex items-center space-x-1"
                              >
                                <Youtube className="w-4 h-4" />
                                <span>Ver video de la clase grabada</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Sin enlace de YouTube</span>
                            )}
                          </div>

                          <button
                            onClick={() => handleStartEdit(cls)}
                            className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Publicar / Modificar Enlaces</span>
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">
                              Link de Google Meet *
                            </label>
                            <input
                              type="url"
                              placeholder="https://meet.google.com/xxx-yyyy-zzz"
                              value={editMeetLink}
                              onChange={(e) => setEditMeetLink(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-teal-200 text-xs focus:ring-2 focus:ring-teal-500/20"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-red-800 uppercase tracking-wider mb-1">
                              Link de YouTube de la Clase Grabada
                            </label>
                            <input
                              type="url"
                              placeholder="https://www.youtube.com/watch?v=..."
                              value={editYoutubeUrl}
                              onChange={(e) => setEditYoutubeUrl(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-red-200 text-xs focus:ring-2 focus:ring-red-500/20"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Notas u Observaciones
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Grabación sesión 2 - Tema Liderazgo"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                            />
                          </div>

                          <div className="flex items-center space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingClassId(null)}
                              className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSaveLinks(cls.id)}
                              className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center justify-center space-x-1"
                            >
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              <span>Guardar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Estudiantes Asignadas y Quién Asistió */}
      {selectedClassForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-1">
              Estudiantes Asignadas
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Clase: <strong>{selectedClassForStudents.title}</strong>
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 mb-6 divide-y divide-slate-100">
              {selectedClassForStudents.enrollments.map((e) => {
                const attended = selectedClassForStudents.attendances.find(
                  (a) => a.studentId === e.student.id
                );

                return (
                  <div key={e.student.id} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{e.student.name}</p>
                      <p className="text-[11px] text-slate-400">{e.student.email}</p>
                    </div>

                    {attended ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Asistió ({new Date(attended.joinedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedClassForStudents(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Materiales / Recursos de Clase */}
      {selectedClassForResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-800">Materiales de Clase</h3>
              <button
                onClick={() => {
                  setSelectedClassForResources(null);
                  resetResourceForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Clase: <strong>{selectedClassForResources.title}</strong>
            </p>

            <div className="max-h-56 overflow-y-auto space-y-2 mb-5">
              {selectedClassForResources.resources.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">Sin materiales agregados todavía.</p>
              ) : (
                selectedClassForResources.resources.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs"
                  >
                    <FileLink
                      fileUrl={res.url}
                      isStoredFile={res.type === 'DOCUMENT'}
                      className="flex items-center space-x-1.5 font-bold text-indigo-900 hover:text-indigo-700"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[220px]">{res.title}</span>
                    </FileLink>
                    <button
                      onClick={() => handleDeleteResource(res.id)}
                      className="text-slate-400 hover:text-red-600 ml-2"
                      title="Eliminar recurso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddResource} className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título del material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Guía de ejercicios - Módulo 3"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enlace (Drive, Canva, etc.)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={resourceLink}
                  onChange={(e) => {
                    setResourceLink(e.target.value);
                    if (e.target.value) {
                      setUploadedResourceKey(null);
                      setUploadedResourceType(null);
                    }
                  }}
                  disabled={!!uploadedResourceKey}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div className="flex items-center">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">o subí un archivo</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <FileUpload
                category="resource"
                accept=".pdf,image/png,image/jpeg,image/webp"
                label="Subir PDF o imagen (máx. 25 MB)"
                onUploaded={(key) => {
                  setUploadedResourceKey(key);
                  setResourceLink('');
                  setUploadedResourceType(key.match(/\.(png|jpe?g|webp)$/i) ? 'IMAGE' : 'PDF');
                }}
              />

              <button
                type="submit"
                disabled={savingResource || !resourceTitle || (!resourceLink && !uploadedResourceKey)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5"
              >
                {savingResource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>Agregar Material</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
