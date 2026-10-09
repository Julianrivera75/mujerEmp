'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, Users, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import FileUpload from '@/components/FileUpload';
import { DateField } from '@/components/ui/DateField';
import { cn } from '@/lib/cn';
import { logClientError } from '@/lib/client-log';
import { DELIVERY_OPTIONS, describeDelivery, TEXT_MIN_LENGTH, type DeliveryType } from '@/lib/delivery';
import { describeInputDate } from '@/lib/format';
import { localInputValue } from '@/lib/months';
import type { Assignment } from '../types';

interface ClassOption {
  id: string;
  title: string;
  students: { id: string; name: string }[];
}

interface CreateAssignmentModalProps {
  open: boolean;
  classes: ClassOption[];
  /** Si viene una tarea, el formulario la edita en lugar de crear una nueva. */
  editing?: Assignment | null;
  onClose: () => void;
  /** Se llama con el id de la tarea guardada para que la página recargue la lista y verifique que aparece. */
  onSaved: (assignmentId: string) => void;
}

type FieldKey = 'classId' | 'title' | 'description' | 'dueDate';

/** Archivo con las instrucciones: uno recién subido (con clave) o el que ya tenía la tarea (sin clave). */
interface Attachment {
  key?: string;
  name: string;
}
type Errors = Partial<Record<FieldKey, string>>;
type Phase = 'form' | 'saving' | 'done';

interface Result {
  assignedTo: number;
  notified: number;
  created: boolean;
}

interface Draft {
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  deliveryType: DeliveryType;
  notesRequired: boolean;
  allowLate: boolean;
}

const DRAFT_KEY = 'tarea-borrador';
const FIELD_ORDER: FieldKey[] = ['classId', 'title', 'description', 'dueDate'];
const DUE_SHORTCUTS = [
  { label: 'En 3 días', days: 3 },
  { label: 'En 1 semana', days: 7 },
  { label: 'En 2 semanas', days: 14 },
];

const readDraft = (): Draft | null => {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (draft: Draft | null) => {
  try {
    if (draft) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // el borrador es una comodidad: si el navegador no lo permite, se sigue sin él
  }
};

/** Fecha límite a las 11:59 p. m., pasados `days` días. */
const endOfDayIn = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return localInputValue(d);
};

export function CreateAssignmentModal({ open, classes, editing, onClose, onSaved }: CreateAssignmentModalProps) {
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachmentTouched, setAttachmentTouched] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('FILE_OR_LINK');
  const [notesRequired, setNotesRequired] = useState(true);
  const [allowLate, setAllowLate] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [result, setResult] = useState<Result | null>(null);

  // La lista de clases se vuelve a cargar tras guardar: no debe reiniciar el formulario ni la pantalla de éxito.
  const classesRef = useRef(classes);
  classesRef.current = classes;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError('');
    setSessionExpired(false);
    setShowStudents(false);
    setPhase('form');
    setResult(null);
    setAttachmentTouched(false);
    setAttachment(editing?.attachmentName ? { name: editing.attachmentName } : null);
    if (editing) {
      setClassId(editing.classSession.id);
      setTitle(editing.title);
      setDescription(editing.description);
      setDueDate(localInputValue(new Date(editing.dueDate)));
      setDeliveryType(editing.deliveryType ?? 'FILE_OR_LINK');
      setNotesRequired(editing.notesRequired ?? true);
      setAllowLate(editing.allowLate ?? true);
      return;
    }
    const draft = readDraft();
    const draftClassStillExists = draft && classesRef.current.some((c) => c.id === draft.classId);
    setClassId(draftClassStillExists ? draft.classId : classesRef.current[0]?.id || '');
    setTitle(draft?.title ?? '');
    setDescription(draft?.description ?? '');
    setDueDate(draft?.dueDate ?? '');
    setDeliveryType(draft?.deliveryType ?? 'FILE_OR_LINK');
    setNotesRequired(draft?.notesRequired ?? true);
    setAllowLate(draft?.allowLate ?? true);
  }, [open, editing]);

  // Si las clases llegan después de abrir el formulario, se elige la primera.
  useEffect(() => {
    if (open && !editing && !classId && classes.length > 0) setClassId(classes[0].id);
  }, [open, editing, classId, classes]);

  // El borrador se guarda al escribir, para no perder lo escrito si se cierra por error o vence la sesión.
  useEffect(() => {
    if (!open || editing || phase === 'done') return;
    if (!title && !description && !dueDate) return;
    writeDraft({ classId, title, description, dueDate, deliveryType, notesRequired, allowLate });
  }, [open, editing, phase, classId, title, description, dueDate, deliveryType, notesRequired, allowLate]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);
  const students = editing ? [] : (selectedClass?.students ?? []);
  const dueText = describeInputDate(dueDate, true);
  const existingSubmissions = editing?.submissions.length ?? 0;
  const requestText = describeDelivery({ deliveryType, notesRequired });

  const validate = (): Errors => {
    const next: Errors = {};
    if (!classId) next.classId = 'Elige la clase de la tarea.';
    if (title.trim().length < 3) next.title = 'Escribe un título de al menos 3 letras.';
    if (description.trim().length < 10 && !attachment) {
      next.description = 'Escribe las instrucciones (mínimo 10 caracteres) o adjunta un archivo con ellas.';
    }
    if (!dueDate) next.dueDate = 'Elige la fecha y también la hora y los minutos (AM/PM) de entrega.';
    else if (
      new Date(dueDate).getTime() < Date.now() &&
      (!editing || new Date(dueDate).getTime() !== new Date(editing.dueDate).getTime())
    ) {
      next.dueDate = 'La fecha límite debe ser futura.';
    }
    return next;
  };

  const focusFirst = (found: Errors) => {
    const first = FIELD_ORDER.find((k) => found[k]);
    if (!first) return;
    const el = document.querySelector<HTMLElement>(`#task-${first}, #task-${first} select`);
    el?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSessionExpired(false);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Revisa los campos marcados en rojo antes de guardar.');
      focusFirst(found);
      return;
    }

    if (uploadingFile) {
      setFormError('Espera a que termine de subirse el archivo.');
      return;
    }
    setPhase('saving');
    try {
      // El campo no lleva zona horaria: se envía como instante absoluto.
      const due = new Date(dueDate).toISOString();
      const content = {
        title,
        description,
        dueDate: due,
        deliveryType,
        notesRequired,
        allowLate,
        // Al editar, sin cambios en el archivo no se envía (se conserva); `null` lo quita.
        ...(!editing || attachmentTouched
          ? { attachment: attachment?.key ? { key: attachment.key, name: attachment.name } : null }
          : {}),
      };
      const res = await fetch('/api/assignments', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...content } : { classId, ...content }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setSessionExpired(true);
        setPhase('form');
        return;
      }
      if (!res.ok || !data) {
        const fields = (data?.fields ?? {}) as Errors;
        setErrors(fields);
        setFormError(data?.error || 'No se pudo guardar la tarea. Inténtalo de nuevo.');
        setPhase('form');
        focusFirst(fields);
        return;
      }
      // El éxito se confirma con lo que devuelve el servidor, no solo con el código de respuesta.
      if (!data.assignment?.id) {
        setFormError(
          'No pudimos confirmar que la tarea se guardó. Revisa la lista de tareas antes de intentarlo de nuevo.',
        );
        setPhase('form');
        return;
      }

      writeDraft(null);
      setResult({ assignedTo: data.assignedTo ?? 0, notified: data.notified ?? 0, created: !editing });
      setPhase('done');
      onSaved(data.assignment.id);
    } catch (err) {
      logClientError('Error guardando la tarea:', err);
      setFormError('No hay conexión con el servidor. Tu borrador sigue aquí: revisa tu internet e inténtalo de nuevo.');
      setPhase('form');
    }
  };

  const resetForAnother = () => {
    writeDraft(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setAttachment(null);
    setAttachmentTouched(false);
    setErrors({});
    setFormError('');
    setResult(null);
    setPhase('form');
  };

  const saving = phase === 'saving';

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={editing ? 'Editar tarea' : 'Crear nueva tarea'}
      size="lg"
    >
      {phase === 'done' && result ? (
        <div className="space-y-4" role="status">
          <p className="flex items-center gap-2 text-base font-bold text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
            {result.created ? 'Tarea creada' : 'Cambios guardados'}
          </p>
          <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <strong>{title.trim()}</strong> — {selectedClass?.title ?? editing?.classSession.title}
            </p>
            <p>
              Pide: <strong>{requestText}</strong>
            </p>
            <p>
              Vence: <strong>{dueText}</strong>
              {allowLate ? ' (acepta entregas tardías)' : ' (no acepta entregas tardías)'}
            </p>
            {result.created &&
              (result.assignedTo === 0 ? (
                <p className="flex items-start gap-1.5 font-semibold text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Esta clase no tiene estudiantes inscritas, así que nadie verá la tarea todavía.</span>
                </p>
              ) : result.notified < result.assignedTo ? (
                <p className="flex items-start gap-1.5 font-semibold text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    La verán {result.assignedTo} estudiantes, pero los avisos no se pudieron enviar. Pueden verla al
                    entrar a Mis tareas.
                  </span>
                </p>
              ) : (
                <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <Users className="h-4 w-4" />
                  La verán {result.assignedTo} {result.assignedTo === 1 ? 'estudiante' : 'estudiantes'} y se les envió
                  un aviso.
                </p>
              ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {result.created && (
              <Button variant="ghost" onClick={resetForAnother}>
                Crear otra
              </Button>
            )}
            <Button onClick={onClose}>Ver mis tareas</Button>
          </div>
        </div>
      ) : (
        <form id="assignment-form" noValidate onSubmit={handleSubmit} className="space-y-6">
          {sessionExpired && (
            <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">Tu sesión venció y la tarea NO se guardó.</p>
              <p className="mt-0.5">
                Tu borrador queda guardado en este navegador.{' '}
                <Link href="/login" className="font-bold underline">
                  Entra de nuevo
                </Link>{' '}
                y vuelve a crear la tarea.
              </p>
            </div>
          )}
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
            >
              {formError}
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-800">1. Clase</h3>
            <Select
              id="task-classId"
              label="Clase asociada"
              required
              value={classId}
              error={errors.classId}
              disabled={Boolean(editing)}
              onChange={(e) => setClassId(e.target.value)}
              hint={editing ? 'La clase de una tarea no se puede cambiar.' : undefined}
            >
              {(editing ? [editing.classSession] : classes).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            {!editing && selectedClass && (
              <div
                className={cn(
                  'rounded-xl border p-3 text-xs',
                  students.length === 0
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700',
                )}
              >
                {students.length === 0 ? (
                  <p className="flex items-start gap-1.5 font-semibold">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Esta clase no tiene estudiantes inscritas: nadie verá la tarea hasta que haya inscritas.
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Users className="h-4 w-4 text-role-ink" />
                      Se asignará a {students.length}{' '}
                      {students.length === 1 ? 'estudiante inscrita' : 'estudiantes inscritas'}.
                      <button
                        type="button"
                        onClick={() => setShowStudents((v) => !v)}
                        className="ml-auto font-bold text-role-ink underline"
                      >
                        {showStudents ? 'Ocultar lista' : 'Ver lista'}
                      </button>
                    </p>
                    {showStudents && (
                      <ul className="mt-2 grid max-h-32 grid-cols-1 gap-x-4 gap-y-0.5 overflow-y-auto sm:grid-cols-2">
                        {students.map((s) => (
                          <li key={s.id} className="truncate">
                            {s.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-800">2. Título e instrucciones</h3>
            <Input
              id="task-title"
              label="Título de la tarea"
              required
              placeholder="Ej: Ensayo reflexivo sobre liderazgo y género"
              value={title}
              error={errors.title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              id="task-description"
              label="Instrucciones escritas"
              required={!attachment}
              rows={4}
              placeholder="Qué deben hacer, cómo se evaluará y qué extensión se espera. Ej: Escribe una reflexión de una página sobre tu experiencia liderando un equipo."
              value={description}
              error={errors.description}
              maxLength={4000}
              onChange={(e) => setDescription(e.target.value)}
              hint={`${description.trim().length} / 4000 caracteres. ${attachment ? 'Opcional: ya adjuntaste un archivo con las instrucciones.' : 'Sé específica: las estudiantes verán esto tal cual.'}`}
            />

            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                ¿Las instrucciones están en un PDF? Adjúntalo aquí
              </p>
              <p className="text-xs text-slate-500">
                Opcional si ya escribiste las instrucciones. PDF o imagen (JPG, PNG, WebP) de hasta 15 MB. Las
                estudiantes inscritas podrán abrirlo desde la tarea.
              </p>
              {attachment && (
                <div className="flex items-center gap-2 rounded-xl bg-role-soft px-3 py-2 text-xs font-semibold text-role-ink">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      setAttachmentTouched(true);
                    }}
                    aria-label="Quitar el archivo de instrucciones"
                    className="rounded-full p-1 hover:bg-white/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <FileUpload
                category="assignment"
                resetOnUploaded
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                label={attachment ? 'Reemplazar el archivo' : 'Subir PDF con las instrucciones'}
                onBusyChange={setUploadingFile}
                onUploaded={(key, name) => {
                  setAttachment({ key, name });
                  setAttachmentTouched(true);
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-800">3. ¿Qué deben entregar?</h3>
            <fieldset className="space-y-2">
              <legend className="sr-only">Tipo de entrega</legend>
              {DELIVERY_OPTIONS.map((o) => (
                <div
                  key={o.value}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-xs transition-colors',
                    deliveryType === o.value ? 'border-role-accent bg-role-soft' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <input
                    id={`delivery-${o.value}`}
                    type="radio"
                    name="deliveryType"
                    value={o.value}
                    checked={deliveryType === o.value}
                    onChange={() => setDeliveryType(o.value)}
                    aria-describedby={`delivery-${o.value}-help`}
                    className="mt-0.5 h-4 w-4 text-role-ink"
                  />
                  <div>
                    <label
                      htmlFor={`delivery-${o.value}`}
                      className="block cursor-pointer text-sm font-bold text-slate-800"
                    >
                      {o.label}
                    </label>
                    <p id={`delivery-${o.value}-help`} className="text-slate-600">
                      {o.help}
                    </p>
                  </div>
                </div>
              ))}
            </fieldset>
            {deliveryType === 'TEXT' ? (
              <p className="text-xs text-slate-500">
                La respuesta escrita es lo que entregan (mínimo {TEXT_MIN_LENGTH} caracteres).
              </p>
            ) : (
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={notesRequired}
                  onChange={(e) => setNotesRequired(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-role-ink"
                />
                <span>
                  <strong>Pedir además un comentario o reflexión</strong> (obligatorio): la estudiante debe escribir
                  unas líneas junto a su entrega.
                </span>
              </label>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-800">4. Fecha límite</h3>
            <div id="task-dueDate">
              <DateField
                label="Fecha y hora límite de entrega"
                kind="datetime"
                required
                value={dueDate}
                onChange={setDueDate}
                error={errors.dueDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Atajos (11:59 p. m.):</span>
              {DUE_SHORTCUTS.map((s) => (
                <button
                  key={s.days}
                  type="button"
                  onClick={() => setDueDate(endOfDayIn(s.days))}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-role-soft"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={(e) => setAllowLate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-role-ink"
              />
              <span>
                <strong>Aceptar entregas después de la fecha límite</strong> (se marcarán como entregadas con retraso).
              </span>
            </label>
          </section>

          {existingSubmissions > 0 && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Ya hay {existingSubmissions} {existingSubmissions === 1 ? 'entrega' : 'entregas'}. Los cambios en lo que
              se pide solo aplican a las entregas nuevas; las ya enviadas no se modifican.
            </p>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-black text-slate-800">5. Revisa cómo la verán las estudiantes</h3>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              <p className="text-base font-bold text-slate-800">{title.trim() || 'Título de la tarea'}</p>
              <p className="whitespace-pre-wrap text-slate-600">
                {description.trim() ||
                  (attachment
                    ? 'Las instrucciones están en el archivo adjunto.'
                    : 'Las instrucciones aparecerán aquí.')}
              </p>
              {attachment && (
                <p className="flex items-center gap-1.5 font-semibold text-role-ink">
                  <FileText className="h-4 w-4" />
                  Instrucciones en archivo: {attachment.name}
                </p>
              )}
              <p>
                <strong>Debes entregar:</strong> {requestText}.
              </p>
              <p>
                <strong>Fecha límite:</strong> {dueText ?? 'sin elegir'}
                {!allowLate && ' — no se aceptan entregas tardías'}
              </p>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
