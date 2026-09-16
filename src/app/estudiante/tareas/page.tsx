'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  ClipboardList, 
  Calendar, 
  Upload, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Star, 
  FileText, 
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import FileUpload from '@/components/FileUpload';

interface Submission {
  id: string;
  submittedAt: string;
  notes: string | null;
  fileUrl: string | null;
  fileType: string | null;
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classSession: { id: string; title: string };
  creator: { name: string };
  submissions: Submission[];
}

export default function StudentTasksPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para entregar tarea
  const [submittingAssignment, setSubmittingAssignment] = useState<StudentAssignment | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [uploadedFileKey, setUploadedFileKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, assRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/assignments'),
      ]);

      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const assData = await assRes.json();
      setAssignments(assData.assignments || []);
    } catch (err) {
      console.error('Error al cargar tareas del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenSubmitModal = (ass: StudentAssignment) => {
    setSubmittingAssignment(ass);
    const existing = ass.submissions[0];
    setSubmissionNotes(existing?.notes || '');
    const isUploadedFile = existing?.fileType === 'PDF' || existing?.fileType === 'IMAGE';
    setSubmissionUrl(isUploadedFile ? '' : existing?.fileUrl || '');
    setUploadedFileKey(isUploadedFile ? existing?.fileUrl || null : null);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;

    setSending(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          uploadedFileKey
            ? {
                assignmentId: submittingAssignment.id,
                notes: submissionNotes,
                fileUrl: uploadedFileKey,
                fileType: uploadedFileKey.match(/\.(png|jpe?g|webp)$/i) ? 'IMAGE' : 'PDF',
              }
            : {
                assignmentId: submittingAssignment.id,
                notes: submissionNotes,
                fileUrl: submissionUrl,
                fileType: 'LINK',
              },
        ),
      });

      if (res.ok) {
        setSubmittingAssignment(null);
        try {
          confetti({
            particleCount: 60,
            spread: 50,
            origin: { y: 0.6 },
          });
        } catch {}
        loadData();
      }
    } catch (err) {
      console.error('Error al enviar entrega:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser && <Navbar user={currentUser} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center space-x-3">
            <ClipboardList className="w-8 h-8 text-fuchsia-600" />
            <span>Mis Tareas, Entregas y Calificaciones</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Consulta tus actividades pendientes, sube tus trabajos o enlaces y revisa las notas y comentarios que tus mentoras prepararon para ti.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-fuchsia-600" />
            <p>Cargando tus tareas...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-500 border border-white">
            <ClipboardList className="w-12 h-12 mx-auto text-purple-300 mb-2" />
            <p className="font-bold text-slate-700">No tienes tareas asignadas por el momento.</p>
            <p className="text-xs text-slate-400 mt-1">¡Buen trabajo! Disfruta de tu tiempo o repasa en el repositorio.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignments.map((ass) => {
              const mySub = ass.submissions[0];
              const isSubmitted = !!mySub;
              const isGraded = mySub && mySub.grade !== null;

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
                  className="glass-card rounded-3xl p-6 sm:p-8 border border-white shadow-xl transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                          Clase: {ass.classSession.title}
                        </span>

                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                          isGraded
                            ? 'bg-purple-100 text-purple-800'
                            : isSubmitted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isGraded ? 'Calificada' : isSubmitted ? 'Entregada' : 'Pendiente por entregar'}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-slate-800">{ass.title}</h2>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        {ass.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          <span>Fecha límite: <strong className="text-slate-700">{formattedDue}</strong></span>
                        </span>
                        <span>•</span>
                        <span>Mentora: <strong className="text-teal-700">{ass.creator.name}</strong></span>
                      </div>

                      {/* Calificación y Retroalimentación de la Mentora */}
                      {isGraded && (
                        <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center">
                              <Star className="w-4 h-4 mr-1 text-purple-600 fill-purple-600" />
                              <span>Calificación Obtenida:</span>
                            </span>
                            <span className="text-xl font-black text-purple-700">
                              {mySub.grade} <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
                            </span>
                          </div>

                          {mySub.feedback && (
                            <div className="mt-2 pt-2 border-t border-purple-100">
                              <p className="text-xs font-bold text-slate-700 flex items-center mb-1">
                                <MessageSquare className="w-3.5 h-3.5 mr-1 text-purple-600" />
                                <span>Comentarios y Retroalimentación de tu Mentora:</span>
                              </p>
                              <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-purple-100 italic leading-relaxed">
                                "{mySub.feedback}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Resumen de tu entrega previa */}
                      {isSubmitted && !isGraded && (
                        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900">
                          <p className="font-bold flex items-center mb-1">
                            <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />
                            <span>Entregaste esta tarea el {new Date(mySub.submittedAt).toLocaleDateString('es-ES')}</span>
                          </p>
                          {mySub.notes && <p className="text-slate-600 italic">"{mySub.notes}"</p>}
                        </div>
                      )}
                    </div>

                    {/* Botón para Entregar */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <button
                        onClick={() => handleOpenSubmitModal(ass)}
                        className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 ${
                          isSubmitted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:from-fuchsia-700 hover:to-pink-700 shadow-pink-500/20'
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isSubmitted ? 'Modificar mi Entrega' : 'Entregar Tarea'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal para Subir Entrega */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-black text-slate-800">
                Enviar Entrega de Tarea
              </h2>
              <button
                onClick={() => setSubmittingAssignment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Tarea: <strong>{submittingAssignment.title}</strong>
            </p>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enlace de tu Trabajo (Google Drive / Docs / Canva / GitHub)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/... o https://drive.google.com/..."
                  value={submissionUrl}
                  onChange={(e) => {
                    setSubmissionUrl(e.target.value);
                    if (e.target.value) setUploadedFileKey(null);
                  }}
                  disabled={!!uploadedFileKey}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-fuchsia-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div className="flex items-center">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">o subí un archivo</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div>
                <FileUpload
                  category="submission"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  label="Subir PDF o imagen (máx. 15 MB)"
                  onUploaded={(key) => {
                    setUploadedFileKey(key);
                    setSubmissionUrl('');
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notas, Reflexión o Mensaje para tu Mentora
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escribe tu reflexión, comentarios o resumen del trabajo realizado..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold text-xs shadow-md flex items-center space-x-1"
                >
                  {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Subir Entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
