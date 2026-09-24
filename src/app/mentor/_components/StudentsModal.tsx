'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import type { MentorClass } from '../types';

export function StudentsModal({ cls, onClose }: { cls: MentorClass | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(cls)}
      onClose={onClose}
      title="Estudiantes asignadas"
      description={cls ? `Clase: ${cls.title}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="max-h-80 space-y-2 divide-y divide-slate-100 overflow-y-auto">
        {cls?.enrollments.map((e) => {
          const attended = cls.attendances.find((a) => a.studentId === e.student.id);
          return (
            <div key={e.student.id} className="flex items-center justify-between pt-2 text-xs">
              <div>
                <p className="font-bold text-slate-800">{e.student.name}</p>
                <p className="text-[11px] text-slate-400">{e.student.email}</p>
              </div>
              {attended ? (
                <StatusPill
                  tone="success"
                  label={`Asistió (${new Date(attended.joinedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`}
                />
              ) : (
                <StatusPill tone="neutral" label="Pendiente" />
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
