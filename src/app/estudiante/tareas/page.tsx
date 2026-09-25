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
import { formatDate, formatDue } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

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
      logClientError('Error al cargar tareas del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
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
          <EmptyState
            icon={ClipboardList}
            title="No tienes tareas asignadas por el momento"
            description="Cuando tu mentora publique una tarea, aparecerá aquí."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((ass) => {
            const mySub = ass.submissions[0];
            const isSubmitted = Boolean(mySub);
            const isGraded = mySub && mySub.grade !== null;
            const dueDate = new Date(ass.dueDate);
            const formattedDue = formatDue(dueDate);

            return (
              <Card key={ass.id} variant="glass" className="p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-role-soft px-3 py-1 text-[11px] font-bold text-role-accent">
                        Clase: {ass.classSession.title}
                      </span>
                      <StatusPill
                        label={isGraded ? 'Calificada' : isSubmitted ? 'Entregada' : 'Pendiente por entregar'}
                        tone={isGraded ? 'info' : isSubmitted ? 'success' : 'warning'}
                      />
                    </div>

                    <h2 className="text-xl font-bold text-slate-800">{ass.title}</h2>
                    <p className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-600">
                      {ass.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Fecha límite: <strong className="text-slate-700">{formattedDue}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Mentora: <strong className="text-teal-700">{ass.creator.name}</strong>
                      </span>
                    </div>

                    {isGraded && (
                      <div className="mt-4 rounded-2xl border border-role-accent/20 bg-gradient-to-r from-role-soft to-white p-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-role-accent">
                            <Star className="h-4 w-4 fill-current" />
                            Calificación obtenida
                          </span>
                          <span className="font-display text-xl font-bold tabular-nums text-role-accent">
                            {mySub.grade} <span className="text-xs font-normal text-slate-500">/ 5.0</span>
                          </span>
                        </div>

                        {mySub.feedback && (
                          <div className="mt-2 border-t border-role-accent/15 pt-2">
                            <p className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-700">
                              <MessageSquare className="h-3.5 w-3.5 text-role-accent" />
                              Comentarios de tu mentora
                            </p>
                            <p className="rounded-xl border border-role-accent/15 bg-white p-3 text-xs italic leading-relaxed text-slate-800">
                              &ldquo;{mySub.feedback}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {isSubmitted && !isGraded && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                        <p className="mb-1 flex items-center gap-1 font-bold">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          Entregaste esta tarea el {formatDate(mySub.submittedAt)}
                        </p>
                        {mySub.notes && <p className="italic text-slate-600">&ldquo;{mySub.notes}&rdquo;</p>}
                      </div>
                    )}
                  </div>

                  <div className="min-w-[200px]">
                    <Button
                      variant={isSubmitted ? 'secondary' : 'primary'}
                      leftIcon={<Upload className="h-4 w-4" />}
                      onClick={() => setSubmittingAssignment(ass)}
                      className="w-full"
                    >
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
