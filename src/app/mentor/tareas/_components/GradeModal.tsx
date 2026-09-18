'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import type { Submission } from '../types';

interface GradeModalProps {
  submission: Submission | null;
  onClose: () => void;
  onSaved: () => void;
}

export function GradeModal({ submission, onClose, onSaved }: GradeModalProps) {
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (submission) {
      setGrade(submission.grade !== null ? String(submission.grade) : '');
      setFeedback(submission.feedback || '');
    }
  }, [submission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;
    setSaving(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id, grade, feedback }),
      });
      if (res.ok) onSaved();
    } catch (err) {
      console.error('Error al calificar:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(submission)} onClose={onClose} title={submission ? `Calificar a ${submission.student.name}` : ''} size="sm">
      <form id="grade-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Calificación (escala de 1.0 a 5.0)"
          type="number"
          step="0.1"
          min="1"
          max="5"
          required
          placeholder="Ej: 4.8"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <Textarea
          label="Comentarios y retroalimentación"
          rows={4}
          required
          placeholder="Escribe comentarios constructivos que motiven y guíen a la estudiante..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </form>

      <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" form="grade-form" loading={saving}>
          Guardar calificación
        </Button>
      </div>
    </Modal>
  );
}
