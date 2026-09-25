'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Youtube,
  Users,
  Clock,
  CheckCircle2,
  Edit,
  Save,
  ExternalLink,
  BookOpen,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSessionUser } from '@/lib/user-context';
import { safeHref } from '@/lib/validators';
import { StudentsModal } from './_components/StudentsModal';
import { ResourcesModal } from './_components/ResourcesModal';
import type { MentorClass } from './types';
import { formatTimeRange, formatWeekdayDateLong } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

export default function MentorDashboardPage() {
  const user = useSessionUser();
  const [classes, setClasses] = useState<MentorClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editMeetLink, setEditMeetLink] = useState('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [selectedClassForStudents, setSelectedClassForStudents] = useState<MentorClass | null>(null);
  const [selectedClassForResources, setSelectedClassForResources] = useState<MentorClass | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data.classes || []);
    } catch (err) {
      logClientError('Error cargando datos del mentor:', err);
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
        setClasses((prev) =>
          prev.map((c) =>
            c.id === classId
              ? {
                  ...c,
                  meetLink: editMeetLink || null,
                  youtubeUrl: editYoutubeUrl || null,
                  recordingNotes: editNotes || null,
                }
              : c,
          ),
        );
        setEditingClassId(null);
      }
    } catch (err) {
      logClientError('Error guardando enlaces:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResourcesUpdated = (updated: MentorClass) => {
    setSelectedClassForResources(updated);
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-role-from via-teal-600 to-role-to p-8 text-white shadow-lift">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              Espacio de mentoría y docencia
            </span>
            <h1 className="font-display text-3xl font-bold">Bienvenida, {user.name}</h1>
            <p className="mt-2 max-w-xl text-sm text-teal-50">
              Gestiona tus clases programadas, publica el enlace de Google Meet, verifica quién asistió y comparte las
              grabaciones de YouTube.
            </p>
          </div>
          <Button
            href="/mentor/tareas"
            variant="secondary"
            leftIcon={<BookOpen className="h-4 w-4 text-teal-600" />}
            className="self-start border-none !bg-white !text-teal-900"
          >
            Calificar tareas
          </Button>
        </div>
      </div>

      <PageHeader
        title="Mis clases y horario programado"
        description="Programadas por la administración. Puedes publicar o actualizar el enlace de Google Meet y YouTube de cada una."
      />

      {loading ? (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : classes.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState
            icon={Calendar}
            title="No tienes clases asignadas por el momento"
            description="La administración te asignará sesiones en el calendario mensual."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {classes.map((cls) => {
            const start = new Date(cls.dateStart);
            const end = new Date(cls.dateEnd);
            const formattedDate = formatWeekdayDateLong(start);
            const formattedTime = formatTimeRange(start, end);
            const isEditing = editingClassId === cls.id;
            const attendedCount = cls.attendances.length;
            const totalEnrolled = cls.enrollments.length;

            return (
              <Card key={cls.id} variant="glass" className="p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={cls.status} tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'} />
                      <span className="text-xs font-semibold capitalize text-slate-500">{formattedDate}</span>
                      <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                        <Clock className="h-3.5 w-3.5" />
                        {formattedTime}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800">{cls.title}</h3>
                    {cls.description && <p className="text-xs leading-relaxed text-slate-600">{cls.description}</p>}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => setSelectedClassForStudents(cls)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-role-soft px-3.5 py-2 text-xs font-bold text-role-ink transition-colors hover:brightness-90"
                      >
                        <Users className="h-4 w-4" />
                        <span>Estudiantes asignadas ({totalEnrolled})</span>
                      </button>

                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>
                          Asistieron: {attendedCount} de {totalEnrolled}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedClassForResources(cls)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Materiales ({cls.resources.length})</span>
                      </button>
                    </div>
                  </div>

                  <div className="w-full space-y-3 rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-soft lg:w-96">
                    {!isEditing ? (
                      <>
                        <div className="space-y-2">
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Enlace de Google Meet:
                          </span>
                          {cls.meetLink ? (
                            <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 p-2.5 text-xs font-bold text-teal-900">
                              <span className="max-w-[200px] truncate">{cls.meetLink}</span>
                              <a
                                href={safeHref(cls.meetLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-teal-700 hover:text-teal-900"
                                aria-label="Abrir sala"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          ) : (
                            <p className="text-xs italic text-amber-600">
                              No has publicado el link de Meet para esta clase.
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 border-t border-slate-100 pt-1">
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Grabación de YouTube:
                          </span>
                          {cls.youtubeUrl ? (
                            <a
                              href={safeHref(cls.youtubeUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
                            >
                              <Youtube className="h-4 w-4" />
                              <span>Ver video de la clase grabada</span>
                            </a>
                          ) : (
                            <span className="text-xs italic text-slate-500">Sin enlace de YouTube</span>
                          )}
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2 w-full"
                          leftIcon={<Edit className="h-3.5 w-3.5" />}
                          onClick={() => handleStartEdit(cls)}
                        >
                          Publicar / modificar enlaces
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          label="Link de Google Meet"
                          type="url"
                          placeholder="https://meet.google.com/xxx-yyyy-zzz"
                          value={editMeetLink}
                          onChange={(e) => setEditMeetLink(e.target.value)}
                        />
                        <Input
                          label="Link de YouTube de la clase grabada"
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={editYoutubeUrl}
                          onChange={(e) => setEditYoutubeUrl(e.target.value)}
                        />
                        <Input
                          label="Notas u observaciones"
                          placeholder="Ej: Grabación sesión 2 — tema liderazgo"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />

                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditingClassId(null)}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            loading={saving}
                            leftIcon={<Save className="h-3.5 w-3.5" />}
                            onClick={() => handleSaveLinks(cls.id)}
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <StudentsModal cls={selectedClassForStudents} onClose={() => setSelectedClassForStudents(null)} />
      <ResourcesModal
        cls={selectedClassForResources}
        onClose={() => setSelectedClassForResources(null)}
        onUpdated={handleResourcesUpdated}
      />
    </div>
  );
}
