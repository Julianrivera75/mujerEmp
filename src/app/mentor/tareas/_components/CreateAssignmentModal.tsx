'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { logClientError } from '@/lib/client-log';
import { localInputValue } from '@/lib/months';
import type { Assignment } from '../types';

interface ClassOption {
  id: string;
  title: string;
}

interface CreateAssignmentModalProps {
  open: boolean;
  classes: ClassOption[];
  /** Si viene una tarea, el formulario la edita en lugar de crear una nueva. */
  editing?: Assignment | null;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAssignmentModal({ open, classes, editing, onClose, onCreated }: CreateAssignmentModalProps) {
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!open) return;
    setError('');
    setCreating(false);
    if (editing) {
      setClassId(editing.classSession.id);
      setTitle(editing.title);
      setDescription(editing.description);
      setDueDate(localInputValue(new Date(editing.dueDate)));
    } else {
      setClassId(classes[0]?.id || '');
      setTitle('');
      setDescription('');
      setDueDate('');
    }
  }, [open, classes, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dueDate) {
      setError('Elige la fecha y la hora límite de entrega.');
      return;
    }
    setCreating(true);
    try {
      // El campo no lleva zona horaria: se envía como instante absoluto.
      const due = new Date(dueDate).toISOString();
      const res = await fetch('/api/assignments', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editing
            ? { id: editing.id, title, description, dueDate: due }
            : { classId, title, description, dueDate: due },
        ),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo guardar la tarea. Inténtalo de nuevo.');
        return;
      }
      onCreated();
    } catch (err) {
      logClientError('Error guardando la tarea:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar tarea' : 'Crear nueva tarea'} size="md">
      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}
      <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Clase asociada"
          required
          value={classId}
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
        <Input
          label="Título de la tarea"
          required
          placeholder="Ej: Ensayo reflexivo sobre liderazgo y género"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Instrucciones detalladas"
          required
          rows={3}
          placeholder="Explica qué deben entregar las estudiantes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <DateField
          label="Fecha y hora límite de entrega"
          kind="datetime"
          required
          value={dueDate}
          onChange={setDueDate}
        />
      </form>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={creating}>
          Cancelar
        </Button>
        <Button type="submit" form="assignment-form" loading={creating}>
          {editing ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
      </div>
    </Modal>
  );
}
