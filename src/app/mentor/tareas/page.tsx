'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, PlusCircle, Calendar, FileText, Star, MessageSquare, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import FileLink from '@/components/FileLink';
import { CreateAssignmentModal } from './_components/CreateAssignmentModal';
import { GradeModal } from './_components/GradeModal';
import type { Assignment, Submission } from './types';

export default function MentorTasksPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const { show } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [assRes, classesRes] = await Promise.all([fetch('/api/assignments'), fetch('/api/classes')]);
      const assData = await assRes.json();
      setAssignments(assData.assignments || []);
      const classesData = await classesRes.json();
      setClasses(classesData.classes || []);
    } catch (err) {
      console.error('Error al cargar tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        eyebrow="Seguimiento"
        title="Tareas, entregas y calificaciones"
        description="Crea tareas, revisa las entregas de las estudiantes y da retroalimentación formativa."
        actions={
          <Button leftIcon={<PlusCircle className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
            Crear nueva tarea
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : assignments.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState icon={ClipboardList} title="Aún no hay tareas creadas" description='Usa "Crear nueva tarea" para asignar la primera actividad.' />
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((ass) => {
            const dueDate = new Date(ass.dueDate);
            const formattedDue = dueDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

            return (
              <Card key={ass.id} variant="glass" className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-role-accent uppercase tracking-wider block mb-1">Clase: {ass.classSession.title}</span>
                    <h2 className="text-xl font-bold text-slate-800">{ass.title}</h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">{ass.description}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      <Calendar className="w-3.5 h-3.5" />
                      Vence: {formattedDue}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{ass.submissions.length} entregas recibidas</p>
                  </div>
                </div>

                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Entregas de estudiantes</h3>

                {ass.submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    Aún ninguna estudiante ha enviado su entrega para esta tarea.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ass.submissions.map((sub) => {
                      const isGraded = sub.grade !== null;
                      return (
                        <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft hover:border-role-accent/30 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-800 text-sm">{sub.student.name}</span>
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isGraded ? 'bg-role-soft text-role-accent' : 'bg-amber-100 text-amber-800'}`}>
                                {isGraded ? `Nota: ${sub.grade} / 5.0` : 'Sin calificar'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 mb-2">
                              Entregada: {new Date(sub.submittedAt).toLocaleDateString('es-ES')} a las {new Date(sub.submittedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>

                            {sub.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-2 italic">&ldquo;{sub.notes}&rdquo;</p>}

                            {sub.fileUrl && (
                              <FileLink fileUrl={sub.fileUrl} isStoredFile={sub.fileType === 'PDF' || sub.fileType === 'IMAGE'} className="inline-flex items-center gap-1.5 text-xs text-role-accent hover:brightness-90 font-bold mb-3">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ver archivo / enlace entregado</span>
                                <ExternalLink className="w-3 h-3" />
                              </FileLink>
                            )}

                            {sub.feedback && (
                              <div className="mt-2 p-2.5 bg-role-soft rounded-xl border border-role-accent/15 text-xs">
                                <p className="font-bold text-role-accent flex items-center gap-1 mb-0.5">
                                  <MessageSquare className="w-3 h-3" />
                                  Tu comentario a la estudiante:
                                </p>
                                <p className="text-slate-700">{sub.feedback}</p>
                              </div>
                            )}
                          </div>

                          <Button variant="secondary" size="sm" className="w-full mt-3" leftIcon={<Star className="w-3.5 h-3.5" />} onClick={() => setGradingSubmission(sub)}>
                            {isGraded ? 'Editar calificación y feedback' : 'Calificar y dar retroalimentación'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <CreateAssignmentModal
        open={isCreateOpen}
        classes={classes}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setIsCreateOpen(false);
          show('success', 'Tarea creada.');
          loadData();
        }}
      />

      <GradeModal
        submission={gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        onSaved={() => {
          setGradingSubmission(null);
          show('success', 'Calificación guardada.');
          loadData();
        }}
      />
    </div>
  );
}
