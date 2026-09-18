'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import FileUpload from '@/components/FileUpload';
import type { StudentAssignment } from '../types';

interface SubmitAssignmentModalProps {
  assignment: StudentAssignment | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitAssignmentModal({ assignment, onClose, onSubmitted }: SubmitAssignmentModalProps) {
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!assignment) return;
    const existing = assignment.submissions[0];
    const isUploadedFile = existing?.fileType === 'PDF' || existing?.fileType === 'IMAGE';
    setNotes(existing?.notes || '');
    setUrl(isUploadedFile ? '' : existing?.fileUrl || '');
    setUploadedKey(isUploadedFile ? existing?.fileUrl || null : null);
  }, [assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setSending(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          uploadedKey
            ? { assignmentId: assignment.id, notes, fileUrl: uploadedKey, fileType: uploadedKey.match(/\.(png|jpe?g|webp)$/i) ? 'IMAGE' : 'PDF' }
            : { assignmentId: assignment.id, notes, fileUrl: url, fileType: 'LINK' },
        ),
      });

      if (res.ok) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduceMotion) {
          try {
            confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 }, colors: ['#D946EF', '#9333EA', '#6366F1', '#14B8A6'] });
          } catch {}
        }
        onSubmitted();
      }
    } catch (err) {
      console.error('Error al enviar entrega:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={Boolean(assignment)} onClose={onClose} title="Enviar entrega de tarea" description={assignment ? `Tarea: ${assignment.title}` : undefined}>
      <form id="submission-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Enlace de tu trabajo (Google Drive, Docs, Canva, GitHub)"
          type="url"
          placeholder="https://docs.google.com/... o https://drive.google.com/..."
          value={url}
          disabled={Boolean(uploadedKey)}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value) setUploadedKey(null);
          }}
        />

        <div className="flex items-center">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">o subí un archivo</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <FileUpload
          category="submission"
          accept=".pdf,image/png,image/jpeg,image/webp"
          label="Subir PDF o imagen (máx. 15 MB)"
          onUploaded={(key) => {
            setUploadedKey(key);
            setUrl('');
          }}
        />

        <Textarea
          label="Notas, reflexión o mensaje para tu mentora"
          rows={4}
          required
          placeholder="Escribe tu reflexión, comentarios o resumen del trabajo realizado..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>

      <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button type="submit" form="submission-form" loading={sending}>
          Subir entrega
        </Button>
      </div>
    </Modal>
  );
}
