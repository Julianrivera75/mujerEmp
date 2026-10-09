'use client';

import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Calendar,
  FileText,
  Star,
  MessageSquare,
  ExternalLink,
  Edit3,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import FileLink from '@/components/FileLink';
import { CreateAssignmentModal } from './_components/CreateAssignmentModal';
import { GradeModal } from './_components/GradeModal';
import type { Assignment, Submission } from './types';
import { formatDate, formatDue, formatTime } from '@/lib/format';
import { logClientError } from '@/lib/client-log';
import { cn } from '@/lib/cn';
import { describeDelivery, isLateSubmission, submissionFiles, submissionLink, taskStatus } from '@/lib/delivery';
import { useHighlight } from '@/lib/use-highlight';

const STATUS_LABEL = { ACTIVE: 'Activa', DUE_SOON: 'Vence pronto', OVERDUE: 'Vencida' } as const;
const STATUS_STYLE = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  DUE_SOON: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-rose-100 text-rose-700',
} as const;

export default function MentorTasksPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<{ id: string; title: string; students: { id: string; name: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const { show } = useToast();
  const highlighted = useHighlight('tarea', 'tarea', !loading);

  /** Carga tareas y clases; devuelve las tareas para poder verificar que una recién creada aparece. */
  const loadData = async (): Promise<Assignment[] | null> => {
    try {
      setLoading(true);
      setLoadError('');
      const [assRes, classesRes] = await Promise.all([fetch('/api/assignments'), fetch('/api/classes')]);
      if (assRes.status === 401 || classesRes.status === 401) {
        setLoadError('Tu sesión venció. Entra de nuevo para ver tus tareas.');
        return null;
      }
      if (!assRes.ok || !classesRes.ok) {
        setLoadError('No pudimos cargar las tareas. Revisa tu conexión e inténtalo de nuevo.');
        return null;
      }
      const assData = await assRes.json();
      const list: Assignment[] = assData.assignments || [];
      setAssignments(list);
      const classesData = await classesRes.json();
      setClasses(
        (classesData.classes || []).map(
          (c: { id: string; title: string; enrollments?: { student: { id: string; name: string } }[] }) => ({
            id: c.id,
            title: c.title,
            students: (c.enrollments ?? []).map((e) => ({ id: e.student.id, name: e.student.name })),
          }),
        ),
      );
      return list;
    } catch (err) {
      logClientError('Error al cargar tareas:', err);
      setLoadError('No pudimos cargar las tareas. Revisa tu conexión e inténtalo de nuevo.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Tras guardar, se recarga la lista y se comprueba que la tarea aparece; si no, se avisa. */
  const handleSaved = async (assignmentId: string) => {
    const list = await loadData();
    if (list && !list.some((a) => a.id === assignmentId)) {
      show('error', 'La tarea se guardó pero no aparece en tu lista. Actualiza la página y avísanos si sigue así.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assignments?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        show('success', 'Tarea eliminada.');
      } else {
        const data = await res.json().catch(() => ({}));
        show('error', data.error || 'No se pudo eliminar la tarea.');
      }
    } catch (err) {
      logClientError('Error eliminando la tarea:', err);
      show('error', 'Error de conexión al eliminar la tarea.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Seguimiento"
        title="Tareas, entregas y calificaciones"
        description="Crea tareas, revisa las entregas de las estudiantes y da retroalimentación formativa."
        actions={
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            Crear nueva tarea
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError ? (
        <Card variant="glass" className="space-y-3 p-6 text-center">
          <p role="alert" className="text-sm font-semibold text-red-700">
            {loadError}
          </p>
          <Button onClick={() => void loadData()}>Reintentar</Button>
        </Card>
      ) : assignments.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState
            icon={ClipboardList}
            title="Aún no hay tareas creadas"
            description='Usa "Crear nueva tarea" para asignar la primera actividad.'
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((ass) => {
            const dueDate = new Date(ass.dueDate);
            const formattedDue = formatDue(dueDate);
            const status = taskStatus(ass.dueDate);
            const lateCount = ass.submissions.filter((sub) => isLateSubmission(sub.submittedAt, ass.dueDate)).length;

            return (
              <Card
                key={ass.id}
                id={`tarea-${ass.id}`}
                variant="glass"
                className={cn(
                  'scroll-mt-24 p-6 transition-shadow sm:p-8',
                  highlighted === ass.id && 'shadow-lift ring-2 ring-role-accent',
                )}
              >
                <div className="mb-4 flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-role-ink">
                      Clase: {ass.classSession.title}
                    </span>
                    {ass.creator && (
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                        Creada por {ass.creator.name}
                      </span>
                    )}
                    <h2 className="text-xl font-bold text-slate-800">{ass.title}</h2>
                    {ass.description && (
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">{ass.description}</p>
                    )}
                    {ass.attachmentName &&
                      (ass.attachmentUrl ? (
                        <a
                          href={ass.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-role-ink hover:brightness-90"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Instrucciones en archivo: {ass.attachmentName}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-xs italic text-slate-500">
                          Instrucciones en archivo: {ass.attachmentName} (no disponible ahora)
                        </p>
                      ))}
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className={cn('rounded-full px-2.5 py-0.5', STATUS_STYLE[status])}>
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                        Pide: {describeDelivery(ass)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                        Asignada a {ass.classSession._count?.enrollments ?? 0}
                      </span>
                      {!ass.allowLate && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                          Sin entregas tardías
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      <Calendar className="h-3.5 w-3.5" />
                      Vence: {formattedDue}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {ass.submissions.length} de {ass.classSession._count?.enrollments ?? 0} entregas recibidas
                      {lateCount > 0 && ` (${lateCount} con retraso)`}
                    </p>
                    <div className="mt-2 flex justify-start gap-2 sm:justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                        onClick={() => setEditingAssignment(ass)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => setDeleteTarget(ass)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>

                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">
                  Entregas de estudiantes
                </h3>

                {ass.submissions.length === 0 ? (
                  <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs italic text-slate-500">
                    Aún ninguna estudiante ha enviado su entrega para esta tarea.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {ass.submissions.map((sub) => {
                      const isGraded = sub.grade !== null;
                      return (
                        <div
                          key={sub.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all hover:border-role-accent/30"
                        >
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-800">{sub.student.name}</span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isGraded ? 'bg-role-soft text-role-ink' : 'bg-amber-100 text-amber-800'}`}
                              >
                                {isGraded ? `Nota: ${sub.grade} / 5.0` : 'Sin calificar'}
                              </span>
                            </div>

                            <p className="mb-2 text-xs text-slate-500">
                              Entregada: {formatDate(sub.submittedAt)} a las {formatTime(sub.submittedAt)}
                              {isLateSubmission(sub.submittedAt, ass.dueDate) && (
                                <span className="ml-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                                  Con retraso
                                </span>
                              )}
                            </p>

                            {sub.notes && (
                              <p className="mb-2 rounded-xl bg-slate-50 p-2.5 text-xs italic text-slate-600">
                                &ldquo;{sub.notes}&rdquo;
                              </p>
                            )}

                            <div className="mb-3 flex flex-col items-start gap-1">
                              {submissionFiles(sub).map((file) => (
                                <FileLink
                                  key={file.key}
                                  fileUrl={file.key}
                                  isStoredFile
                                  className="inline-flex items-center gap-1.5 text-left text-xs font-bold text-role-ink hover:brightness-90"
                                >
                                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="break-all">{file.name}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </FileLink>
                              ))}
                              {submissionLink(sub) && (
                                <FileLink
                                  fileUrl={submissionLink(sub) as string}
                                  isStoredFile={false}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-role-ink hover:brightness-90"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Abrir el enlace entregado</span>
                                </FileLink>
                              )}
                            </div>

                            {sub.feedback && (
                              <div className="mt-2 rounded-xl border border-role-accent/15 bg-role-soft p-2.5 text-xs">
                                <p className="mb-0.5 flex items-center gap-1 font-bold text-role-ink">
                                  <MessageSquare className="h-3 w-3" />
                                  Tu comentario a la estudiante:
                                </p>
                                <p className="text-slate-700">{sub.feedback}</p>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-3 w-full"
                            leftIcon={<Star className="h-3.5 w-3.5" />}
                            onClick={() => setGradingSubmission(sub)}
                          >
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
        editing={editingAssignment}
        open={isCreateOpen || Boolean(editingAssignment)}
        classes={classes}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingAssignment(null);
        }}
        onSaved={(id) => void handleSaved(id)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar esta tarea?"
        description={
          deleteTarget
            ? `Se eliminará "${deleteTarget.title}"${deleteTarget.creator ? ` (creada por ${deleteTarget.creator.name})` : ''} junto con ${deleteTarget.submissions.length} entrega${deleteTarget.submissions.length === 1 ? '' : 's'}, los archivos que las estudiantes subieron y los avisos que recibieron. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar tarea"
        loading={deleting}
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
