'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Video, Youtube } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PersonChecklist } from '@/components/ui/PersonChecklist';
import { PersonSearch } from '@/components/ui/PersonSearch';
import { DateField } from '@/components/ui/DateField';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Tip } from '@/components/ui/Tip';
import { localInputValue } from '@/lib/months';
import type { ClassItem, SimpleUser } from '../types';
import { ClassImagesField, type ClassImageItem } from './ClassImagesField';

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
  /** Recibe la clase guardada para que la página muestre su mes de inmediato. */
  onSaved: (saved?: { id: string; monthKey: string; dateStart: string }) => void;
}

/** Fotos actuales de la clase, con su dirección firmada para la vista previa (acepta clases con una sola foto antigua). */
function initialImages(mode: 'create' | 'edit', cls: ClassItem | null): ClassImageItem[] {
  if (mode !== 'edit' || !cls) return [];
  const keys = cls.imageKeys?.length ? cls.imageKeys : cls.imageKey ? [cls.imageKey] : [];
  const urls = cls.imageUrls?.length ? cls.imageUrls : cls.imageUrl ? [cls.imageUrl] : [];
  return keys.map((key, i) => ({ key, url: urls[i] ?? '' }));
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
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ClassImageItem[]>(() => initialImages(mode, editingClass));
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setFormData(buildInitialForm(mode, editingClass, mentors, students));
      setErrorMsg('');
      setSubmitting(false);
      setImages(initialImages(mode, editingClass));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, editingClass]);

  const mentorOptions = useMemo(() => mentors.map((m) => ({ id: m.id, name: m.name, subtitle: m.email })), [mentors]);
  const studentOptions = useMemo(
    () => students.map((st) => ({ id: st.id, name: st.name, subtitle: st.email })),
    [students],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.mentorId) {
      setErrorMsg('Elige la mentora de la clase: escribe su nombre y selecciónala de la lista.');
      return;
    }
    if (new Date(formData.dateEnd) <= new Date(formData.dateStart)) {
      setErrorMsg('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    if (uploading) {
      setErrorMsg('Espera a que termine la subida de la foto.');
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
      const body = { ...formData, ...dates, imageKeys: images.map((i) => i.key) };
      const payload = mode === 'create' ? body : { ...body, id: editingClass?.id };

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

      setSubmitting(false);
      onSaved(data.classSession);
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor. Tus datos siguen aquí: inténtalo de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
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
          <DateField
            label="Inicio"
            kind="datetime"
            required
            value={formData.dateStart}
            onChange={(value) => setFormData({ ...formData, dateStart: value })}
          />
          <DateField
            label="Fin"
            kind="datetime"
            required
            value={formData.dateEnd}
            onChange={(value) => setFormData({ ...formData, dateEnd: value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PersonSearch
            label="Mentora asignada"
            required
            placeholder="Escribe el nombre de la mentora..."
            options={mentorOptions}
            value={formData.mentorId || null}
            onChange={(id) => setFormData({ ...formData, mentorId: id ?? '' })}
          />
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
            <span>Grabación en YouTube (se muestra en Clases grabadas)</span>
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

        <ClassImagesField images={images} onChange={setImages} onBusyChange={setUploading} />

        <PersonChecklist
          label="Estudiantes asignadas"
          options={studentOptions}
          selectedIds={formData.studentIds}
          onChange={(ids) => setFormData((prev) => ({ ...prev, studentIds: ids }))}
          emptyText="No hay estudiantes activas registradas."
        />
      </form>

      {submitting && (
        <div className="mt-4 space-y-1.5" role="status" aria-live="polite">
          <p className="text-xs font-semibold text-role-ink">
            {mode === 'create' ? 'Creando la clase e inscribiendo a las estudiantes...' : 'Guardando los cambios...'}
          </p>
          <ProgressBar indeterminate label="Guardando la clase" />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" form="class-form" loading={submitting} disabled={uploading}>
          {mode === 'create' ? 'Crear clase' : 'Actualizar clase'}
        </Button>
      </div>
    </Modal>
  );
}
