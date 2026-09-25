'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import FileUpload from '@/components/FileUpload';
import type { StudentAssignment } from '../types';
import { logClientError } from '@/lib/client-log';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    if (!uploadedKey && !url.trim()) {
      setError('Sube una foto (JPG o PNG) o un PDF de tu trabajo, o pega un enlace.');
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
            : { assignmentId: assignment.id, notes, fileUrl: url, fileType: 'LINK' },
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
      <form id="submission-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Tu trabajo</p>
          <p className="text-xs text-slate-500">
            Sube una foto de tu taller hecho a mano (JPG o PNG) o un archivo PDF. Máximo 15 MB.
          </p>
          <FileUpload
            category="submission"
            accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
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

        <details className="rounded-xl border border-slate-200 p-3 text-xs" open={Boolean(url)}>
          <summary className="cursor-pointer font-semibold text-slate-600">
            ¿Prefieres enviar un enlace (Google Drive, Docs, Canva)?
          </summary>
          <div className="mt-3">
            <Input
              label="Enlace de tu trabajo"
              type="url"
              placeholder="https://docs.google.com/..."
              value={url}
              disabled={Boolean(uploadedKey)}
              onChange={(e) => setUrl(e.target.value)}
              hint={uploadedKey ? 'Ya subiste un archivo; el enlace queda desactivado.' : undefined}
            />
          </div>
        </details>

        <Textarea
          label="Notas, reflexión o mensaje para tu mentor/a"
          rows={4}
          required
          placeholder="Escribe tu reflexión, comentarios o resumen del trabajo realizado..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button type="submit" form="submission-form" loading={sending}>
          Enviar entrega
        </Button>
      </div>
    </Modal>
  );
}
