'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, PlusCircle, Trash2, Video, Youtube } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { PersonChecklist } from '@/components/ui/PersonChecklist';
import { PersonSearch } from '@/components/ui/PersonSearch';
import { DateField } from '@/components/ui/DateField';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Tip } from '@/components/ui/Tip';
import { useToast } from '@/components/ui/Toast';
import { dayKeyOf } from '@/lib/attendance-days';
import { localInputValue } from '@/lib/months';
import { findMentorOverlaps } from '@/lib/schedule-overlap';
import type { ClassItem, SimpleUser } from '../types';
import { ClassImagesField, type ClassImageItem } from './ClassImagesField';

const MAX_SLOTS = 3;

/** Una clase dentro de la programación del día (hasta 3, bajo el mismo link). */
interface ClassSlotData {
  /** Presente solo si ya existía (se está editando); ausente en una clase nueva. */
  id?: string;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  mentorId: string;
  images: ClassImageItem[];
}

/** Campos de toda la programación del día (una sola vez, compartidos por las 1 a 3 clases). */
interface SharedFormData {
  meetLink: string;
  youtubeUrl: string;
  recordingNotes: string;
  status: string;
  studentIds: string[];
}

interface ClassFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** Vacío al crear; en edición, la clase y sus hermanas (si comparten groupId) — de 1 a 3. */
  editingClasses: ClassItem[];
  mentors: SimpleUser[];
  students: SimpleUser[];
  onClose: () => void;
  /** Recibe la primera clase guardada para que la página muestre su mes de inmediato. */
  onSaved: (saved?: { monthKey: string; dateStart: string }) => void;
}

function emptySlot(mentors: SimpleUser[], start: Date, end: Date): ClassSlotData {
  return {
    title: '',
    description: '',
    dateStart: localInputValue(start),
    dateEnd: localInputValue(end),
    mentorId: mentors[0]?.id || '',
    images: [],
  };
}

/** Fotos actuales de la clase, con su dirección firmada para la vista previa (acepta clases con una sola foto antigua). */
function initialImages(cls: ClassItem): ClassImageItem[] {
  const keys = cls.imageKeys?.length ? cls.imageKeys : cls.imageKey ? [cls.imageKey] : [];
  const urls = cls.imageUrls?.length ? cls.imageUrls : cls.imageUrl ? [cls.imageUrl] : [];
  return keys.map((key, i) => ({ key, url: urls[i] ?? '' }));
}

function slotFromClass(cls: ClassItem): ClassSlotData {
  return {
    id: cls.id,
    title: cls.title,
    description: cls.description || '',
    dateStart: localInputValue(new Date(cls.dateStart)),
    dateEnd: localInputValue(new Date(cls.dateEnd)),
    mentorId: cls.mentor.id,
    images: initialImages(cls),
  };
}

function buildInitialState(
  mode: 'create' | 'edit',
  editingClasses: ClassItem[],
  mentors: SimpleUser[],
  students: SimpleUser[],
): { shared: SharedFormData; slots: ClassSlotData[] } {
  if (mode === 'edit' && editingClasses.length > 0) {
    const first = editingClasses[0];
    return {
      shared: {
        meetLink: first.meetLink || '',
        youtubeUrl: first.youtubeUrl || '',
        recordingNotes: first.recordingNotes || '',
        status: first.status,
        studentIds: first.enrollments.map((e) => e.student.id),
      },
      slots: [...editingClasses]
        .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
        .map(slotFromClass),
    };
  }
  const today = new Date();
  const at = (hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour);
  return {
    shared: {
      meetLink: 'https://meet.google.com/new',
      youtubeUrl: '',
      recordingNotes: '',
      status: 'PROGRAMADA',
      studentIds: students.map((s) => s.id),
    },
    slots: [emptySlot(mentors, at(15), at(17))],
  };
}

export function ClassFormModal({
  open,
  mode,
  editingClasses,
  mentors,
  students,
  onClose,
  onSaved,
}: ClassFormModalProps) {
  const [shared, setShared] = useState<SharedFormData>(
    () => buildInitialState(mode, editingClasses, mentors, students).shared,
  );
  const [slots, setSlots] = useState<ClassSlotData[]>(
    () => buildInitialState(mode, editingClasses, mentors, students).slots,
  );
  const [submitting, setSubmitting] = useState(false);
  // Cada clase sube su propia foto por separado; un solo flag compartido entre las 3 hacía que la
  // subida de una pisara el estado "ocupado" de las otras. Se guarda por índice de clase.
  const [busySlots, setBusySlots] = useState<Set<number>>(new Set());
  const uploading = busySlots.size > 0;
  const setSlotBusy = (index: number, busy: boolean) =>
    setBusySlots((prev) => {
      const next = new Set(prev);
      if (busy) next.add(index);
      else next.delete(index);
      return next;
    });
  const [errorMsg, setErrorMsg] = useState('');
  const { show } = useToast();

  useEffect(() => {
    if (open) {
      const initial = buildInitialState(mode, editingClasses, mentors, students);
      setShared(initial.shared);
      setSlots(initial.slots);
      setErrorMsg('');
      setSubmitting(false);
      setBusySlots(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, editingClasses]);

  const mentorOptions = useMemo(() => mentors.map((m) => ({ id: m.id, name: m.name, subtitle: m.email })), [mentors]);
  const studentOptions = useMemo(
    () => students.map((st) => ({ id: st.id, name: st.name, subtitle: st.email })),
    [students],
  );
  const mentorNameOf = useMemo(() => new Map(mentors.map((m) => [m.id, m.name])), [mentors]);

  const updateSlot = (index: number, patch: Partial<ClassSlotData>) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const addSlot = () => {
    const last = slots[slots.length - 1];
    const lastEnd = last ? new Date(last.dateEnd) : new Date();
    setSlots((prev) => [...prev, emptySlot(mentors, lastEnd, new Date(lastEnd.getTime() + 60 * 60 * 1000))]);
  };

  const removeSlot = (index: number) => setSlots((prev) => prev.filter((_, i) => i !== index));

  const moveSlot = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /** Avisos (no bloqueo) de mentora cruzada entre las clases que se están armando ahora mismo. */
  const overlapWarnings = useMemo(() => {
    const candidates = slots
      .filter((s) => s.mentorId && s.dateStart && s.dateEnd)
      .map((s) => ({
        mentorId: s.mentorId,
        mentorName: mentorNameOf.get(s.mentorId) ?? '',
        title: s.title || 'Sin título',
        dateStart: new Date(s.dateStart),
        dateEnd: new Date(s.dateEnd),
      }));
    return findMentorOverlaps(candidates);
  }, [slots, mentorNameOf]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    for (const slot of slots) {
      if (!slot.mentorId) {
        setErrorMsg('Elige la mentora de cada clase: escribe su nombre y selecciónala de la lista.');
        return;
      }
      if (new Date(slot.dateEnd) <= new Date(slot.dateStart)) {
        setErrorMsg('La fecha de fin de cada clase debe ser posterior a la de inicio.');
        return;
      }
    }
    if (slots.length > 1) {
      const days = new Set(slots.map((s) => dayKeyOf(new Date(s.dateStart))));
      if (days.size > 1) {
        setErrorMsg('Las clases de una misma programación deben ser del mismo día.');
        return;
      }
    }
    if (uploading) {
      setErrorMsg('Espera a que termine la subida de la foto.');
      return;
    }
    setSubmitting(true);

    try {
      const slotPayload = slots.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        dateStart: new Date(s.dateStart).toISOString(),
        dateEnd: new Date(s.dateEnd).toISOString(),
        mentorId: s.mentorId,
        imageKeys: s.images.map((i) => i.key),
      }));

      const wasGroup = mode === 'edit' && editingClasses.length > 1;
      const useGroupEndpoint = slots.length > 1 || wasGroup;

      let res: Response;
      if (!useGroupEndpoint) {
        const url = '/api/classes';
        const method = mode === 'create' ? 'POST' : 'PUT';
        const body = {
          ...shared,
          ...slotPayload[0],
          id: mode === 'edit' ? editingClasses[0]?.id : undefined,
        };
        res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        const url = '/api/classes/group';
        const method = mode === 'create' ? 'POST' : 'PUT';
        const removedIds =
          mode === 'edit' ? editingClasses.filter((c) => !slots.some((s) => s.id === c.id)).map((c) => c.id) : [];
        const body = {
          ...shared,
          groupId: mode === 'edit' ? (editingClasses[0]?.groupId ?? null) : undefined,
          slots: slotPayload,
          removedIds,
        };
        res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo guardar la programación.');
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      const saved = data.classSession ?? data.classSessions?.[0];
      for (const w of data.warnings ?? []) {
        show(
          'info',
          `Aviso: ${w.mentorName} queda con "${w.classATitle}" y "${w.classBTitle}" cruzadas en el horario.`,
        );
      }
      onSaved(saved);
    } catch (err) {
      setErrorMsg('Error al conectar con el servidor. Tus datos siguen aquí: inténtalo de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={mode === 'create' ? 'Programar clases del día' : 'Editar programación del día'}
      size="lg"
    >
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>
      )}
      {overlapWarnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {overlapWarnings.map((w, i) => (
            <p key={i}>
              Aviso: <strong>{w.mentorName}</strong> queda con &quot;{w.classATitle}&quot; y &quot;{w.classBTitle}
              &quot; cruzadas en el horario. Puedes guardar igual si es a propósito.
            </p>
          ))}
        </div>
      )}

      <form id="class-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Input
            label="Enlace de Google Meet (compartido por las clases del día)"
            type="url"
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            leftIcon={<Video className="h-4 w-4 text-teal-600" />}
            value={shared.meetLink}
            onChange={(e) => setShared({ ...shared, meetLink: e.target.value })}
          />
          <Tip className="mt-2">
            Al hacer clic en este enlace, el sistema registrará automáticamente la asistencia de la estudiante para todo
            el día, sin importar a cuál de las clases entre.
          </Tip>
        </div>

        <div className="space-y-4">
          {slots.map((slot, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Clase {index + 1} de {slots.length}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveSlot(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mover la clase ${index + 1} hacia arriba`}
                    className="tap-target rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlot(index, 1)}
                    disabled={index === slots.length - 1}
                    aria-label={`Mover la clase ${index + 1} hacia abajo`}
                    className="tap-target rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      aria-label={`Quitar la clase ${index + 1}`}
                      className="tap-target flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>
              </div>

              <Input
                label="Título de la clase / módulo"
                required
                placeholder="Ej: Módulo 4 — Redes de apoyo y liderazgo digital"
                value={slot.title}
                onChange={(e) => updateSlot(index, { title: e.target.value })}
              />

              <Textarea
                label="Descripción u objetivos"
                rows={2}
                placeholder="Temas a tratar en esta sesión..."
                value={slot.description}
                onChange={(e) => updateSlot(index, { description: e.target.value })}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateField
                  label="Inicio"
                  kind="datetime"
                  required
                  value={slot.dateStart}
                  onChange={(value) => updateSlot(index, { dateStart: value })}
                />
                <DateField
                  label="Fin"
                  kind="datetime"
                  required
                  value={slot.dateEnd}
                  onChange={(value) => updateSlot(index, { dateEnd: value })}
                />
              </div>

              <PersonSearch
                label="Mentora asignada"
                required
                placeholder="Escribe el nombre de la mentora..."
                options={mentorOptions}
                value={slot.mentorId || null}
                onChange={(id) => updateSlot(index, { mentorId: id ?? '' })}
              />

              <ClassImagesField
                images={slot.images}
                onChange={(images) => updateSlot(index, { images })}
                onBusyChange={(busy) => setSlotBusy(index, busy)}
              />
            </div>
          ))}
        </div>

        {slots.length < MAX_SLOTS && (
          <Button type="button" variant="secondary" leftIcon={<PlusCircle className="h-4 w-4" />} onClick={addSlot}>
            Agregar otra clase del mismo día ({slots.length} de {MAX_SLOTS})
          </Button>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Estado de la programación"
            value={shared.status}
            onChange={(e) => setShared({ ...shared, status: e.target.value })}
          >
            <option value="PROGRAMADA">Programada</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>
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
            value={shared.youtubeUrl}
            onChange={(e) => setShared({ ...shared, youtubeUrl: e.target.value })}
            className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <input
            type="text"
            aria-label="Notas de la grabación"
            placeholder="Notas u observaciones de la grabación..."
            value={shared.recordingNotes}
            onChange={(e) => setShared({ ...shared, recordingNotes: e.target.value })}
            className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-xs text-slate-700"
          />
        </div>

        <PersonChecklist
          label="Estudiantes asignadas"
          options={studentOptions}
          selectedIds={shared.studentIds}
          onChange={(ids) => setShared((prev) => ({ ...prev, studentIds: ids }))}
          emptyText="No hay estudiantes activas registradas."
        />
      </form>

      {submitting && (
        <div className="mt-4 space-y-1.5" role="status" aria-live="polite">
          <p className="text-xs font-semibold text-role-ink">
            {mode === 'create'
              ? 'Creando la programación e inscribiendo a las estudiantes...'
              : 'Guardando los cambios...'}
          </p>
          <ProgressBar indeterminate label="Guardando la programación" />
        </div>
      )}

      <div className="mt-5 flex flex-col items-end gap-2 border-t border-slate-100 pt-5">
        {uploading && (
          <p className="text-xs font-semibold text-amber-700">
            Espera a que terminen de subir las fotos para poder guardar.
          </p>
        )}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="class-form" loading={submitting} disabled={uploading}>
            {mode === 'create' ? 'Crear programación' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
