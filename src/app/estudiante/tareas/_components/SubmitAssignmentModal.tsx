'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import FileUpload from '@/components/FileUpload';
import type { StudentAssignment } from '../types';
import { logClientError } from '@/lib/client-log';
import {
  deliveryFields,
  describeDelivery,
  isLateSubmission,
  SUBMISSION_FILE_LIMIT,
  TEXT_MIN_LENGTH,
  validateDelivery,
} from '@/lib/delivery';
import { formatDue } from '@/lib/format';

interface SubmitAssignmentModalProps {
  assignment: StudentAssignment | null;
  onClose: () => void;
  onSubmitted: () => void;
}

const fileTypeOf = (key: string) => (/\.(png|jpe?g|webp)$/i.test(key) ? 'IMAGE' : 'PDF');

export function SubmitAssignmentModal({ assignment, onClose, onSubmitted }: SubmitAssignmentModalProps) {
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assignment) return;
    const existing = assignment.submissions[0];
    const isUploadedFile = existing?.fileType === 'PDF' || existing?.fileType === 'IMAGE';
    setNotes(existing?.notes || '');
    setUrl(isUploadedFile ? '' : existing?.fileUrl || '');
    setUploadedKey(isUploadedFile ? existing?.fileUrl || null : null);
    setError('');
  }, [assignment]);

  const fields = assignment ? deliveryFields(assignment.deliveryType) : { file: true, link: true, text: false };
  const late = assignment ? isLateSubmission(new Date(), assignment.dueDate) : false;
  const existing = assignment?.submissions[0];
  const notesLabel =
    assignment?.deliveryType === 'TEXT'
      ? 'Tu respuesta'
      : assignment?.deliveryType === 'ANY'
        ? 'Tu respuesta escrita (opcional si subes un archivo o un enlace)'
        : assignment?.notesRequired
          ? 'Comentario o reflexión (obligatorio)'
          : 'Comentario para tu mentor/a (opcional)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    const link = url.trim();
    if (link && !link.toLowerCase().startsWith('https://')) {
      setError('El enlace debe empezar por https://');
      return;
    }
    const problem = validateDelivery(assignment, { notes, fileKey: uploadedKey, link: link || null });
    if (problem) {
      setError(problem);
      return;
    }
    if (late && !assignment.allowLate) {
      setError('La fecha límite ya pasó y esta tarea no recibe entregas tardías.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          uploadedKey
            ? { assignmentId: assignment.id, notes, fileUrl: uploadedKey, fileType: fileTypeOf(uploadedKey) }
            : link
              ? { assignmentId: assignment.id, notes, fileUrl: link, fileType: 'LINK' }
              : { assignmentId: assignment.id, notes },
        ),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo enviar la entrega. Inténtalo de nuevo.');
        return;
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        try {
          confetti({
            particleCount: 60,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#D946EF', '#9333EA', '#6366F1', '#14B8A6'],
          });
        } catch {
          // la animación es opcional
        }
      }
      onSubmitted();
    } catch (err) {
      logClientError('Error al enviar entrega:', err);
      setError('Error de conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={Boolean(assignment)}
      onClose={onClose}
      title="Enviar entrega de tarea"
      description={assignment ? `Tarea: ${assignment.title}` : undefined}
    >
      <form id="submission-form" noValidate onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {assignment && (
          <div className="space-y-1 rounded-2xl border border-role-accent/20 bg-role-soft p-3.5 text-xs text-slate-700">
            <p>
              <strong>Tu mentora pide:</strong> {describeDelivery(assignment)}.
            </p>
            <p>
              <strong>Fecha límite:</strong> {formatDue(assignment.dueDate)}
            </p>
            {late && (
              <p className="font-bold text-rose-700">
                {assignment.allowLate
                  ? 'La fecha límite ya pasó: tu entrega se enviará marcada como con retraso.'
                  : 'La fecha límite ya pasó y esta tarea no recibe entregas tardías.'}
              </p>
            )}
            {existing && (
              <p className="text-slate-600">Ya entregaste esta tarea. Enviar de nuevo reemplaza tu entrega anterior.</p>
            )}
          </div>
        )}

        {fields.file && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Archivo</p>
            <p className="text-xs text-slate-500">{SUBMISSION_FILE_LIMIT}. Un solo archivo.</p>
            <FileUpload
              category="submission"
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
              label="Subir foto o PDF"
              onUploaded={(key) => {
                setUploadedKey(key);
                setUrl('');
                setError('');
              }}
            />
            {uploadedKey && (
              <p className="text-xs font-semibold text-emerald-700">
                Archivo listo para enviar. Puedes subir otro para reemplazarlo.
              </p>
            )}
          </div>
        )}

        {fields.link && (
          <details className="rounded-xl border border-slate-200 p-3 text-xs" open={Boolean(url) || !fields.file}>
            <summary className="cursor-pointer font-semibold text-slate-600">
              {fields.file ? '¿Prefieres enviar un enlace (Google Drive, Docs, Canva)?' : 'Enlace de tu trabajo'}
            </summary>
            <div className="mt-3">
              <Input
                label="Enlace de tu trabajo"
                type="url"
                placeholder="https://docs.google.com/..."
                value={url}
                disabled={Boolean(uploadedKey)}
                onChange={(e) => setUrl(e.target.value)}
                hint={uploadedKey ? 'Ya subiste un archivo; el enlace queda desactivado.' : 'Debe empezar por https://'}
              />
            </div>
          </details>
        )}

        {
          <Textarea
            label={notesLabel}
            rows={assignment?.deliveryType === 'TEXT' ? 8 : 4}
            placeholder={
              assignment?.deliveryType === 'TEXT'
                ? 'Escribe aquí tu respuesta...'
                : 'Escribe tu reflexión, comentarios o resumen del trabajo realizado...'
            }
            hint={
              assignment?.deliveryType === 'TEXT' || assignment?.deliveryType === 'ANY'
                ? `${notes.trim().length} caracteres (mínimo ${TEXT_MIN_LENGTH} si solo respondes con texto).`
                : undefined
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        }
      </form>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button type="submit" form="submission-form" loading={sending} disabled={late && !assignment?.allowLate}>
          Enviar entrega
        </Button>
      </div>
    </Modal>
  );
}
