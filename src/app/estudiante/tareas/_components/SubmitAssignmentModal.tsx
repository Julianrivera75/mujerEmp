'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { FileDropZone, type UploadedFile } from '@/components/FileDropZone';
import type { StudentAssignment } from '../types';
import { logClientError } from '@/lib/client-log';
import {
  describeDelivery,
  isLateSubmission,
  submissionFiles,
  submissionLink,
  TEXT_MIN_LENGTH,
  validateDelivery,
  type Requirement,
} from '@/lib/delivery';
import { formatDue } from '@/lib/format';

interface SubmitAssignmentModalProps {
  assignment: StudentAssignment | null;
  onClose: () => void;
  onSubmitted: () => void;
}

/** Etiqueta "Obligatorio" u "Opcional" junto al título de cada parte de la entrega. */
function RequirementBadge({ requirement }: { requirement: Requirement }) {
  if (requirement === 'NONE') return null;
  return (
    <span
      className={
        requirement === 'REQUIRED'
          ? 'rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700'
          : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600'
      }
    >
      {requirement === 'REQUIRED' ? 'Obligatorio' : 'Opcional'}
    </span>
  );
}

export function SubmitAssignmentModal({ assignment, onClose, onSubmitted }: SubmitAssignmentModalProps) {
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assignment) return;
    const existing = assignment.submissions[0];
    setNotes(existing?.notes || '');
    setUrl(existing ? (submissionLink(existing) ?? '') : '');
    setFiles(existing ? submissionFiles(existing).map((f) => ({ key: f.key, name: f.name })) : []);
    setError('');
  }, [assignment]);

  const late = assignment ? isLateSubmission(new Date(), assignment.dueDate) : false;
  const existing = assignment?.submissions[0];
  const wantsFile = assignment?.fileRequirement !== 'NONE';
  const wantsLink = assignment?.linkRequirement !== 'NONE';
  const wantsText = assignment?.textRequirement !== 'NONE';
  const textOnly = !wantsFile && !wantsLink;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    if (uploading) {
      setError('Espera a que termine de subirse el archivo.');
      return;
    }
    const link = url.trim();
    if (link && !link.toLowerCase().startsWith('https://')) {
      setError('El enlace debe empezar por https://');
      return;
    }
    const problem = validateDelivery(assignment, { notes, fileCount: files.length, link: link || null });
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
        body: JSON.stringify({
          assignmentId: assignment.id,
          notes,
          files: files.map((f) => ({ key: f.key, name: f.name })),
          link: link || null,
        }),
      });

      if (res.status === 401) {
        setError('Tu sesión venció y la entrega NO se envió. Entra de nuevo y vuelve a intentarlo.');
        return;
      }
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
      <form id="submission-form" noValidate onSubmit={handleSubmit} className="space-y-5">
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

        {assignment && wantsFile && (
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              {assignment.maxFiles > 1 ? `Archivos (hasta ${assignment.maxFiles})` : 'Archivo'}
              <RequirementBadge requirement={assignment.fileRequirement} />
            </p>
            <FileDropZone
              inputId="submission-files"
              category="submission"
              value={files}
              onChange={(next) => {
                setFiles(next);
                setError('');
              }}
              maxFiles={assignment.maxFiles}
              onBusyChange={setUploading}
            />
          </section>
        )}

        {assignment && wantsLink && (
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              Enlace
              <RequirementBadge requirement={assignment.linkRequirement} />
            </p>
            <Input
              aria-label="Enlace de tu trabajo"
              type="url"
              placeholder="https://docs.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              hint="Google Drive, Docs, Canva, YouTube... Debe empezar por https://"
            />
          </section>
        )}

        {assignment && wantsText && (
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              {textOnly ? 'Tu respuesta' : 'Texto o comentario'}
              <RequirementBadge requirement={assignment.textRequirement} />
            </p>
            <Textarea
              aria-label={textOnly ? 'Tu respuesta' : 'Texto o comentario para tu mentor/a'}
              rows={textOnly ? 8 : 4}
              placeholder={
                textOnly
                  ? 'Escribe aquí tu respuesta...'
                  : 'Escribe tu reflexión, comentarios o resumen del trabajo realizado...'
              }
              hint={
                textOnly
                  ? `${notes.trim().length} caracteres (mínimo ${TEXT_MIN_LENGTH}).`
                  : `${notes.trim().length} caracteres.`
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>
        )}
      </form>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="submission-form"
          loading={sending}
          disabled={(late && !assignment?.allowLate) || uploading}
        >
          Enviar entrega
        </Button>
      </div>
    </Modal>
  );
}
