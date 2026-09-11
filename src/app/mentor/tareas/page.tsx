'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  ClipboardList, 
  PlusCircle, 
  Calendar, 
  CheckCircle, 
  FileText, 
  Star, 
  MessageSquare, 
  Loader2, 
  X,
  ExternalLink
} from 'lucide-react';

interface Submission {
  id: string;
  submittedAt: string;
  notes: string | null;
  fileUrl: string | null;
  fileType: string | null;
  grade: number | null;
  feedback: string | null;
  student: { id: string; name: string; email: string };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classSession: { id: string; title: string };
  submissions: Submission[];
}

export default function MentorTasksPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para crear tarea
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal para calificar entrega
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, assRes, classesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/assignments'),
        fetch('/api/classes'),
      ]);

      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const assData = await assRes.json();
      setAssignments(assData.assignments || []);

      const classesData = await classesRes.json();
      setClasses(classesData.classes || []);
      if (classesData.classes?.length > 0) {
        setNewClassId(classesData.classes[0].id);
      }
    } catch (err) {
      console.error('Error al cargar tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: newClassId,
          title: newTitle,
          description: newDesc,
          dueDate: newDueDate,
        }),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        loadData();
      }
    } catch (err) {
      console.error('Error creando tarea:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenGrade = (sub: Submission) => {
    setGradingSubmission(sub);
    setGradeInput(sub.grade !== null ? String(sub.grade) : '');
    setFeedbackInput(sub.feedback || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    setSavingGrade(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: gradingSubmission.id,
          grade: gradeInput,
          feedback: feedbackInput,
        }),
      });

      if (res.ok) {
        setGradingSubmission(null);
        loadData();
      }
    } catch (err) {
      console.error('Error al calificar:', err);
    } finally {
      setSavingGrade(false);
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
              <ClipboardList className="w-8 h-8 text-teal-600" />
              <span>Tareas, Entregas y Calificaciones</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Crea tareas para tus clases, revisa los archivos y reflexiones de las estudiantes, asigna calificaciones y proporciona retroalimentación formativa.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Nueva Tarea</span>
          </button>
        </div>

        {/* Lista de Tareas y sus Entregas */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
            <p>Cargando tareas y entregas...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-500 border border-white">
            <ClipboardList className="w-12 h-12 mx-auto text-teal-300 mb-2" />
            <p className="font-bold text-slate-700">Aún no hay tareas creadas.</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en "Crear Nueva Tarea" para asignar la primera actividad.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignments.map((ass) => {
              const dueDate = new Date(ass.dueDate);
              const formattedDue = dueDate.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ass.id}
                  className="glass-card rounded-3xl p-6 sm:p-8 border border-white shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
                        Clase: {ass.classSession.title}
                      </span>
                      <h2 className="text-xl font-bold text-slate-800">{ass.title}</h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">{ass.description}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        <span>Vence: {formattedDue}</span>
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {ass.submissions.length} entregas recibidas
                      </p>
                    </div>
                  </div>

                  {/* Entregas de Estudiantes */}
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                    Entregas de Estudiantes:
                  </h3>

                  {ass.submissions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      Aún ninguna estudiante ha enviado su entrega para esta tarea.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ass.submissions.map((sub) => {
                        const isGraded = sub.grade !== null;

                        return (
                          <div
                            key={sub.id}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-800 text-sm">{sub.student.name}</span>
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  isGraded ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isGraded ? `Nota: ${sub.grade} / 5.0` : 'Sin calificar'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-400 mb-2">
                                Entregada: {new Date(sub.submittedAt).toLocaleDateString('es-ES')} a las {new Date(sub.submittedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>

                              {sub.notes && (
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-2 italic">
                                  "{sub.notes}"
                                </p>
                              )}

                              {sub.fileUrl && (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1.5 text-xs text-teal-600 hover:text-teal-800 font-bold mb-3"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Ver Archivo / Enlace Entregado</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}

                              {sub.feedback && (
                                <div className="mt-2 p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-xs">
                                  <p className="font-bold text-purple-900 flex items-center mb-0.5">
                                    <MessageSquare className="w-3 h-3 mr-1 text-purple-600" />
                                    <span>Tu comentario a la estudiante:</span>
                                  </p>
                                  <p className="text-purple-800">{sub.feedback}</p>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleOpenGrade(sub)}
                              className="w-full mt-3 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                            >
                              <Star className="w-3.5 h-3.5 text-teal-600" />
                              <span>{isGraded ? 'Editar Calificación & Feedback' : 'Calificar & Dar Retroalimentación'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Crear Tarea */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-black text-slate-800">Crear Nueva Tarea / Asignación</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Clase Asociada *
                </label>
                <select
                  required
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la Tarea *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ensayo reflexivo sobre liderazgo y género"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Instrucciones Detalladas *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explica qué deben entregar las estudiantes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha y Hora Límite de Entrega *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md"
                >
                  {creating ? 'Guardando...' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calificar y Retroalimentar */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-black text-slate-800">
                Calificar a {gradingSubmission.student.name}
              </h2>
              <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Calificación (Escala de 1.0 a 5.0) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  required
                  placeholder="Ej: 4.8"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Comentarios y Retroalimentación Formativa *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escribe comentarios constructivos que motiven y guíen a la estudiante en su aprendizaje..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center space-x-1"
                >
                  {savingGrade && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Calificación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
