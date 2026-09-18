'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, Upload, CheckCircle, Clock, MessageSquare, Star } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { SubmitAssignmentModal } from './_components/SubmitAssignmentModal';
import type { StudentAssignment } from './types';

export default function StudentTasksPage() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingAssignment, setSubmittingAssignment] = useState<StudentAssignment | null>(null);
  const { show } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assignments');
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error('Error al cargar tareas del estudiante:', err);
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
        title="Mis tareas, entregas y calificaciones"
        description="Consulta tus actividades pendientes, sube tus trabajos o enlaces y revisa las notas y comentarios de tus mentoras."
      />

      {loading ? (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : assignments.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState icon={ClipboardList} title="No tienes tareas asignadas por el momento" description="Cuando tu mentora publique una tarea, aparecerá aquí." />
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((ass) => {
            const mySub = ass.submissions[0];
            const isSubmitted = Boolean(mySub);
            const isGraded = mySub && mySub.grade !== null;
            const dueDate = new Date(ass.dueDate);
            const formattedDue = dueDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

            return (
              <Card key={ass.id} variant="glass" className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-role-accent bg-role-soft px-3 py-1 rounded-full">Clase: {ass.classSession.title}</span>
                      <StatusPill
                        label={isGraded ? 'Calificada' : isSubmitted ? 'Entregada' : 'Pendiente por entregar'}
                        tone={isGraded ? 'info' : isSubmitted ? 'success' : 'warning'}
                      />
                    </div>

                    <h2 className="text-xl font-bold text-slate-800">{ass.title}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">{ass.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Fecha límite: <strong className="text-slate-700">{formattedDue}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Mentora: <strong className="text-teal-700">{ass.creator.name}</strong>
                      </span>
                    </div>

                    {isGraded && (
                      <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-role-soft to-white border border-role-accent/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-role-accent uppercase tracking-wider flex items-center gap-1">
                            <Star className="w-4 h-4 fill-current" />
                            Calificación obtenida
                          </span>
                          <span className="font-display tabular-nums text-xl font-bold text-role-accent">
                            {mySub.grade} <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
                          </span>
                        </div>

                        {mySub.feedback && (
                          <div className="mt-2 pt-2 border-t border-role-accent/15">
                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                              <MessageSquare className="w-3.5 h-3.5 text-role-accent" />
                              Comentarios de tu mentora
                            </p>
                            <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-role-accent/15 italic leading-relaxed">&ldquo;{mySub.feedback}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    )}

                    {isSubmitted && !isGraded && (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Entregaste esta tarea el {new Date(mySub.submittedAt).toLocaleDateString('es-ES')}
                        </p>
                        {mySub.notes && <p className="text-slate-600 italic">&ldquo;{mySub.notes}&rdquo;</p>}
                      </div>
                    )}
                  </div>

                  <div className="min-w-[200px]">
                    <Button variant={isSubmitted ? 'secondary' : 'primary'} leftIcon={<Upload className="w-4 h-4" />} onClick={() => setSubmittingAssignment(ass)} className="w-full">
                      {isSubmitted ? 'Modificar mi entrega' : 'Entregar tarea'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SubmitAssignmentModal
        assignment={submittingAssignment}
        onClose={() => setSubmittingAssignment(null)}
        onSubmitted={() => {
          setSubmittingAssignment(null);
          show('success', 'Entrega enviada.');
          loadData();
        }}
      />
    </div>
  );
}
