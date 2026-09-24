'use client';

import React, { useEffect, useState } from 'react';
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
import { safeHref } from '@/lib/validators';
import { ClassFormModal } from './_components/ClassFormModal';
import type { ClassItem, SimpleUser } from './types';

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [mentors, setMentors] = useState<SimpleUser[]>([]);
  const [students, setStudents] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
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
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        eyebrow="Programación"
        title="Programación mensual de clases"
        description="Programa las clases virtuales, vincula Google Meet y carga las grabaciones de YouTube para las estudiantes."
        actions={
          <Button leftIcon={<PlusCircle className="w-4 h-4" />} onClick={handleOpenCreate}>
            Programar nueva clase
          </Button>
        }
      />

      <Card variant="glass" className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtrar por mes</span>
          <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-auto">
            <option value="2026-08">Agosto 2026</option>
            <option value="2026-09">Septiembre 2026 (actual)</option>
            <option value="2026-10">Octubre 2026</option>
            <option value="2026-11">Noviembre 2026</option>
            <option value="2026-12">Diciembre 2026</option>
            <option value="ALL">Ver todas las clases</option>
          </Select>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total en este periodo: <strong className="text-role-accent">{classes.length} clases</strong>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const start = new Date(cls.dateStart);
            const end = new Date(cls.dateEnd);
            const formattedDate = start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            const formattedTime = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

            return (
              <Card key={cls.id} variant="interactive" className="p-6 flex flex-col justify-between cursor-default">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusPill label={cls.status} tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'} pulse={cls.status !== 'FINALIZADA'} />
                    <span className="text-xs font-semibold text-role-accent capitalize">{formattedDate}</span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-800 mb-1">{cls.title}</h2>
                  {cls.description && <p className="text-xs text-slate-500 line-clamp-2 mb-4">{cls.description}</p>}

                  <div className="space-y-2 mb-4 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Horario:</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-role-accent" />
                        {formattedTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Docente asignada:</span>
                      <span className="font-bold text-teal-700">{cls.mentor.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Estudiantes citadas:</span>
                      <span className="font-bold text-role-accent">{cls.enrollments.length} alumnas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Asistencia registrada:</span>
                      <span className="font-bold text-emerald-600">
                        {cls.attendances.length} de {cls.enrollments.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                        <Video className="w-4 h-4 text-teal-600" />
                        Google Meet:
                      </span>
                      {cls.meetLink ? (
                        <a href={safeHref(cls.meetLink)} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-900 font-bold underline truncate max-w-[200px]">
                          {cls.meetLink}
                        </a>
                      ) : (
                        <span className="text-amber-600 italic">No configurado</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                        <Youtube className="w-4 h-4 text-red-600" />
                        Grabación YouTube:
                      </span>
                      {cls.youtubeUrl ? (
                        <a href={safeHref(cls.youtubeUrl)} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 font-bold underline truncate max-w-[200px]">
                          Ver en YouTube
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Sin grabación cargada</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" leftIcon={<Edit3 className="w-3.5 h-3.5" />} onClick={() => handleOpenEdit(cls)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleteTarget(cls)}>
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
        description={deleteTarget ? `Se eliminará "${deleteTarget.title}" y todos sus registros de asistencia y tareas asociadas.` : undefined}
        confirmLabel="Eliminar clase"
        loading={deleting}
      />
    </div>
  );
}
