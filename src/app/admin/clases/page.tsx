'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, PlusCircle, Video, Youtube, Clock, Edit3, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatTimeRange, formatWeekdayDate } from '@/lib/format';
import { monthKeyOf, monthOptions } from '@/lib/months';
import { safeHref } from '@/lib/validators';
import { ClassFormModal } from './_components/ClassFormModal';
import type { ClassItem, ManagedUser, SimpleUser } from './types';
import { logClientError } from '@/lib/client-log';

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [mentors, setMentors] = useState<SimpleUser[]>([]);
  const [students, setStudents] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKeyOf(new Date()));
  const months = useMemo(() => monthOptions(), []);
  const { show } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, usersRes] = await Promise.all([
        fetch(`/api/classes?monthKey=${selectedMonth}`),
        fetch('/api/admin/users'),
      ]);

      const classesData = await classesRes.json();
      setClasses(classesData.classes || []);

      const usersData = await usersRes.json();
      const allUsers = usersData.users || [];
      setMentors(allUsers.filter((u: ManagedUser) => u.role === 'MENTOR' && u.status === 'ACTIVO'));
      setStudents(allUsers.filter((u: ManagedUser) => u.role === 'STUDENT' && u.status === 'ACTIVO'));
    } catch (err) {
      logClientError('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setModalMode('edit');
    setEditingClass(cls);
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    setIsModalOpen(false);
    show('success', modalMode === 'create' ? 'Clase creada.' : 'Cambios guardados.');
    loadData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/classes?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setClasses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        show('success', 'Clase eliminada.');
      } else {
        show('error', 'No se pudo eliminar la clase.');
      }
    } catch (err) {
      show('error', 'Error de conexión al eliminar la clase.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Programación"
        title="Programación mensual de clases"
        description="Programa las clases virtuales, vincula Google Meet y carga las grabaciones de YouTube para las estudiantes."
        actions={
          <Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={handleOpenCreate}>
            Programar nueva clase
          </Button>
        }
      />

      <Card variant="glass" className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtrar por mes</span>
          <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-auto">
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
                {month.current ? ' (actual)' : ''}
              </option>
            ))}
            <option value="ALL">Ver todas las clases</option>
          </Select>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total en este periodo: <strong className="text-role-ink">{classes.length} clases</strong>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : classes.length === 0 ? (
        <Card variant="glass" className="p-0">
          <EmptyState
            icon={CalendarIcon}
            title="No hay clases programadas para este mes"
            description='Usa "Programar nueva clase" para crear la primera sesión de capacitación del periodo.'
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {classes.map((cls) => {
            const start = new Date(cls.dateStart);
            const end = new Date(cls.dateEnd);
            const formattedDate = formatWeekdayDate(start);
            const formattedTime = formatTimeRange(start, end);

            return (
              <Card key={cls.id} variant="interactive" className="flex cursor-default flex-col justify-between p-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <StatusPill
                      label={cls.status}
                      tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'}
                      pulse={cls.status !== 'FINALIZADA'}
                    />
                    <span className="text-xs font-semibold capitalize text-role-ink">{formattedDate}</span>
                  </div>

                  <h2 className="mb-1 text-lg font-bold text-slate-800">{cls.title}</h2>
                  {cls.description && <p className="mb-4 line-clamp-2 text-xs text-slate-500">{cls.description}</p>}

                  <div className="mb-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Horario:</span>
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-role-ink" />
                        {formattedTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Docente asignada:</span>
                      <span className="font-bold text-teal-700">{cls.mentor.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Estudiantes citadas:</span>
                      <span className="font-bold text-role-ink">{cls.enrollments.length} alumnas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Asistencia registrada:</span>
                      <span className="font-bold text-emerald-600">
                        {cls.attendances.length} de {cls.enrollments.length}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <Video className="h-4 w-4 text-teal-600" />
                        Google Meet:
                      </span>
                      {cls.meetLink ? (
                        <a
                          href={safeHref(cls.meetLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-[200px] truncate font-bold text-teal-700 underline hover:text-teal-900"
                        >
                          {cls.meetLink}
                        </a>
                      ) : (
                        <span className="italic text-amber-600">No configurado</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <Youtube className="h-4 w-4 text-red-600" />
                        Grabación YouTube:
                      </span>
                      {cls.youtubeUrl ? (
                        <a
                          href={safeHref(cls.youtubeUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-[200px] truncate font-bold text-red-600 underline hover:text-red-800"
                        >
                          Ver en YouTube
                        </a>
                      ) : (
                        <span className="italic text-slate-500">Sin grabación cargada</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => handleOpenEdit(cls)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleteTarget(cls)}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ClassFormModal
        open={isModalOpen}
        mode={modalMode}
        editingClass={editingClass}
        mentors={mentors}
        students={students}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar esta clase?"
        description={
          deleteTarget
            ? `Se eliminará "${deleteTarget.title}" y todos sus registros de asistencia y tareas asociadas.`
            : undefined
        }
        confirmLabel="Eliminar clase"
        loading={deleting}
      />
    </div>
  );
}
