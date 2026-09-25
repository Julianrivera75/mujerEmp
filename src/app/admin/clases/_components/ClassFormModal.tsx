'use client';

import React, { useEffect, useState } from 'react';
import { Video, Youtube } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Tip } from '@/components/ui/Tip';
import { localInputValue } from '@/lib/months';
import type { ClassItem, SimpleUser } from '../types';

export interface ClassFormData {
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  mentorId: string;
  meetLink: string;
  youtubeUrl: string;
  recordingNotes: string;
  status: string;
  studentIds: string[];
}

interface ClassFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  editingClass: ClassItem | null;
  mentors: SimpleUser[];
  students: SimpleUser[];
  onClose: () => void;
  onSaved: () => void;
}

function buildInitialForm(
  mode: 'create' | 'edit',
  cls: ClassItem | null,
  mentors: SimpleUser[],
  students: SimpleUser[],
): ClassFormData {
  if (mode === 'edit' && cls) {
    return {
      title: cls.title,
      description: cls.description || '',
      dateStart: localInputValue(new Date(cls.dateStart)),
      dateEnd: localInputValue(new Date(cls.dateEnd)),
      mentorId: cls.mentor.id,
      meetLink: cls.meetLink || '',
      youtubeUrl: cls.youtubeUrl || '',
      recordingNotes: cls.recordingNotes || '',
      status: cls.status,
      studentIds: cls.enrollments.map((e) => e.student.id),
    };
  }
  const today = new Date();
  const at = (hour: number) => localInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour));
  return {
    title: '',
    description: '',
    dateStart: at(15),
    dateEnd: at(17),
    mentorId: mentors[0]?.id || '',
    meetLink: 'https://meet.google.com/new',
    youtubeUrl: '',
    recordingNotes: '',
    status: 'PROGRAMADA',
    studentIds: students.map((s) => s.id),
  };
}

export function ClassFormModal({ open, mode, editingClass, mentors, students, onClose, onSaved }: ClassFormModalProps) {
  const [formData, setFormData] = useState<ClassFormData>(() =>
    buildInitialForm(mode, editingClass, mentors, students),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setFormData(buildInitialForm(mode, editingClass, mentors, students));
      setErrorMsg('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, editingClass]);

  const toggleAllStudents = () => {
    setFormData((prev) =>
      prev.studentIds.length === students.length
        ? { ...prev, studentIds: [] }
        : { ...prev, studentIds: students.map((s) => s.id) },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (new Date(formData.dateEnd) <= new Date(formData.dateStart)) {
      setErrorMsg('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    setSubmitting(true);

    try {
      const url = '/api/classes';
      const method = mode === 'create' ? 'POST' : 'PUT';
      // El campo datetime-local no lleva zona horaria: se envía como instante absoluto.
      const dates = {
        dateStart: new Date(formData.dateStart).toISOString(),
        dateEnd: new Date(formData.dateEnd).toISOString(),
      };
      const payload = mode === 'create' ? { ...formData, ...dates } : { ...formData, ...dates, id: editingClass?.id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo guardar la clase.');
        setSubmitting(false);
        return;
      }

      onSaved();
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Programar clase virtual' : 'Editar datos de clase'}
      size="lg"
    >
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>
      )}

      <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título de la clase / módulo"
          required
          placeholder="Ej: Módulo 4 — Redes de apoyo y liderazgo digital"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />

        <Textarea
          label="Descripción u objetivos"
          rows={2}
          placeholder="Temas a tratar en esta sesión..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Fecha y hora inicio"
            type="datetime-local"
            required
            value={formData.dateStart}
            onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
          />
          <Input
            label="Fecha y hora fin"
            type="datetime-local"
            required
            value={formData.dateEnd}
            onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Mentora asignada"
            required
            value={formData.mentorId}
            onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}
          >
            <option value="">Selecciona una mentora...</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </Select>
          <Select
            label="Estado de la clase"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="PROGRAMADA">Programada</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>
        </div>

        <div>
          <Input
            label="Enlace de Google Meet"
            type="url"
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            leftIcon={<Video className="h-4 w-4 text-teal-600" />}
            value={formData.meetLink}
            onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })}
          />
          <Tip className="mt-2">
            Al hacer clic en este enlace, el sistema registrará automáticamente la asistencia de la estudiante.
          </Tip>
        </div>

        <div className="space-y-2 rounded-2xl border border-red-100 bg-red-50/50 p-4">
          <label
            htmlFor="class-youtube-url"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-900"
          >
            <Youtube className="h-4 w-4 text-red-600" />
            <span>Grabación en YouTube (para repositorio)</span>
          </label>
          <input
            id="class-youtube-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
            value={formData.youtubeUrl}
            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
            className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <input
            type="text"
            aria-label="Notas de la grabación"
            placeholder="Notas u observaciones de la grabación..."
            value={formData.recordingNotes}
            onChange={(e) => setFormData({ ...formData, recordingNotes: e.target.value })}
            className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs text-slate-700"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Estudiantes asignadas ({formData.studentIds.length} seleccionadas)
            </label>
            <button
              type="button"
              onClick={toggleAllStudents}
              className="text-xs font-bold text-role-accent hover:underline"
            >
              {formData.studentIds.length === students.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="max-h-36 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2.5">
            {students.length === 0 ? (
              <p className="p-2 text-xs text-slate-400">No hay estudiantes activas registradas.</p>
            ) : (
              students.map((st) => {
                const checked = formData.studentIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2 text-xs hover:bg-role-soft"
                  >
                    <span className="font-semibold text-slate-800">
                      {st.name} ({st.email})
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          studentIds: checked
                            ? prev.studentIds.filter((id) => id !== st.id)
                            : [...prev.studentIds, st.id],
                        }))
                      }
                      className="h-4 w-4 rounded text-role-accent focus:ring-primary/40"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
      </form>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" form="class-form" loading={submitting}>
          {mode === 'create' ? 'Crear clase' : 'Actualizar clase'}
        </Button>
      </div>
    </Modal>
  );
}
