'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

interface ClassOption {
  id: string;
  title: string;
}

interface CreateAssignmentModalProps {
  open: boolean;
  classes: ClassOption[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAssignmentModal({ open, classes, onClose, onCreated }: CreateAssignmentModalProps) {
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  React.useEffect(() => {
    if (open) setClassId(classes[0]?.id || '');
  }, [open, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, title, description, dueDate }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setDueDate('');
        onCreated();
      }
    } catch (err) {
      console.error('Error creando tarea:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Crear nueva tarea" size="md">
      <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
        <Select label="Clase asociada" required value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
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
        <Input
          label="Fecha y hora límite de entrega"
          type="datetime-local"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </form>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onClose} disabled={creating}>
          Cancelar
        </Button>
        <Button type="submit" form="assignment-form" loading={creating}>
          Crear tarea
        </Button>
      </div>
    </Modal>
  );
}
