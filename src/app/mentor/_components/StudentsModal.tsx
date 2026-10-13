'use client';

import React, { useEffect } from 'react';
import { Highlight } from '@/components/ui/Highlight';
import { SearchBox } from '@/components/ui/SearchBox';
import { useNameFilter } from '@/hooks/useNameFilter';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import type { MentorClass } from '../types';
import { formatTime } from '@/lib/format';

export function StudentsModal({ cls, onClose }: { cls: MentorClass | null; onClose: () => void }) {
  const enrollments = cls?.enrollments ?? [];
  const { query, setQuery, results, isFiltering } = useNameFilter(enrollments, (e) => [
    e.student.name,
    e.student.email,
  ]);

  // Al abrir otra clase, la búsqueda empieza de cero.
  useEffect(() => setQuery(''), [cls?.id, setQuery]);

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
      {enrollments.length > 6 && (
        <div className="mb-3">
          <SearchBox
            aria-label="Buscar estudiante"
            placeholder="Escribe el nombre de una estudiante..."
            value={query}
            onChange={setQuery}
          />
        </div>
      )}
      <div className="max-h-80 space-y-2 divide-y divide-slate-100 overflow-y-auto">
        {isFiltering && results.length === 0 && (
          <p className="pt-2 text-xs text-slate-500">Nadie se parece a «{query.trim()}».</p>
        )}
        {results.map((e) => {
          if (!cls) return null;
          const attended = cls.attendances.find((a) => a.studentId === e.student.id);
          return (
            <div key={e.student.id} className="flex items-center justify-between pt-2 text-xs">
              <div>
                <p className="font-bold text-slate-800">
                  <Highlight text={e.student.name} query={query} />
                </p>
                <p className="text-[11px] text-slate-500">{e.student.email}</p>
              </div>
              {attended ? (
                <StatusPill tone="success" label={`Asistió (${formatTime(attended.joinedAt)})`} />
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
