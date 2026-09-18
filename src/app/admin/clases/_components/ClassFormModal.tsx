'use client';

import React, { useEffect, useState } from 'react';
import { Video, Youtube } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Tip } from '@/components/ui/Tip';
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

function buildInitialForm(mode: 'create' | 'edit', cls: ClassItem | null, mentors: SimpleUser[], students: SimpleUser[]): ClassFormData {
  if (mode === 'edit' && cls) {
    return {
      title: cls.title,
      description: cls.description || '',
      dateStart: new Date(cls.dateStart).toISOString().slice(0, 16),
      dateEnd: new Date(cls.dateEnd).toISOString().slice(0, 16),
      mentorId: cls.mentor.id,
      meetLink: cls.meetLink || '',
      youtubeUrl: cls.youtubeUrl || '',
      recordingNotes: cls.recordingNotes || '',
      status: cls.status,
      studentIds: cls.enrollments.map((e) => e.student.id),
    };
  }
  return {
    title: '',
    description: '',
    dateStart: '2026-09-18T15:00',
    dateEnd: '2026-09-18T17:00',
    mentorId: mentors[0]?.id || '',
    meetLink: 'https://meet.google.com/new',
    youtubeUrl: '',
    recordingNotes: '',
    status: 'PROGRAMADA',
    studentIds: students.map((s) => s.id),
  };
}

export function ClassFormModal({ open, mode, editingClass, mentors, students, onClose, onSaved }: ClassFormModalProps) {
  const [formData, setFormData] = useState<ClassFormData>(() => buildInitialForm(mode, editingClass, mentors, students));
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
      prev.studentIds.length === students.length ? { ...prev, studentIds: [] } : { ...prev, studentIds: students.map((s) => s.id) },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const url = '/api/classes';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const payload = mode === 'create' ? formData : { ...formData, id: editingClass?.id };

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
    <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Programar clase virtual' : 'Editar datos de clase'} size="lg">
      {errorMsg && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">{errorMsg}</div>}

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Mentora asignada" required value={formData.mentorId} onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}>
            <option value="">Selecciona una mentora...</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </Select>
          <Select label="Estado de la clase" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
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
            leftIcon={<Video className="w-4 h-4 text-teal-600" />}
            value={formData.meetLink}
            onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })}
          />
          <Tip className="mt-2">Al hacer clic en este enlace, el sistema registrará automáticamente la asistencia de la estudiante.</Tip>
        </div>

        <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-red-900 uppercase tracking-wider">
            <Youtube className="w-4 h-4 text-red-600" />
            <span>Grabación en YouTube (para repositorio)</span>
          </label>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
            value={formData.youtubeUrl}
            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-red-200 text-xs text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
          />
          <input
            type="text"
            placeholder="Notas u observaciones de la grabación..."
            value={formData.recordingNotes}
            onChange={(e) => setFormData({ ...formData, recordingNotes: e.target.value })}
            className="w-full px-3.5 py-1.5 rounded-xl border border-red-200 text-xs text-slate-700 bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Estudiantes asignadas ({formData.studentIds.length} seleccionadas)
            </label>
            <button type="button" onClick={toggleAllStudents} className="text-xs text-role-accent font-bold hover:underline">
              {formData.studentIds.length === students.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 divide-y divide-slate-100 bg-white">
            {students.length === 0 ? (
              <p className="text-xs text-slate-400 p-2">No hay estudiantes activas registradas.</p>
            ) : (
              students.map((st) => {
                const checked = formData.studentIds.includes(st.id);
                return (
                  <label key={st.id} className="flex items-center justify-between py-2 px-2 hover:bg-role-soft rounded-xl cursor-pointer text-xs">
                    <span className="font-semibold text-slate-800">
                      {st.name} ({st.email})
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          studentIds: checked ? prev.studentIds.filter((id) => id !== st.id) : [...prev.studentIds, st.id],
                        }))
                      }
                      className="rounded text-role-accent focus:ring-primary/40 h-4 w-4"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
      </form>

      <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-slate-100">
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
