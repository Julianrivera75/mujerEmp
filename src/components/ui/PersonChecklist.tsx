'use client';

import React, { useId, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Highlight } from '@/components/ui/Highlight';
import { SearchBox } from '@/components/ui/SearchBox';
import type { PersonOption } from '@/components/ui/PersonSearch';
import { cn } from '@/lib/cn';
import { rankMatches } from '@/lib/text-search';

interface PersonChecklistProps {
  /** Título de la lista, por ejemplo "Estudiantes asignadas". */
  label: string;
  options: readonly PersonOption[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
  /** Alto máximo de la lista (clase de Tailwind). */
  maxHeightClass?: string;
}

/**
 * Elegir a VARIAS personas de una lista con casillas, con un buscador que, al escribir, deja arriba a quienes más se
 * parecen. Permite marcar o quitar de una vez todas las que coinciden con lo escrito.
 */
export function PersonChecklist({
  label,
  options,
  selectedIds,
  onChange,
  emptyText = 'No hay personas para elegir.',
  maxHeightClass = 'max-h-56',
}: PersonChecklistProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtering = query.trim().length > 0;

  const shown = useMemo(
    () => rankMatches(options, query, (o) => [o.name, o.subtitle ?? '']).map((r) => r.item),
    [options, query],
  );
  const allShownSelected = shown.length > 0 && shown.every((o) => selected.has(o.id));

  const toggle = (optionId: string) =>
    onChange(selected.has(optionId) ? selectedIds.filter((x) => x !== optionId) : [...selectedIds, optionId]);

  const setShown = (checked: boolean) => {
    const ids = new Set(shown.map((o) => o.id));
    onChange(checked ? Array.from(new Set([...selectedIds, ...ids])) : selectedIds.filter((x) => !ids.has(x)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-700" id={`${id}-title`}>
          {label} ({selectedIds.length} seleccionadas)
        </p>
        {shown.length > 0 && (
          <button
            type="button"
            onClick={() => setShown(!allShownSelected)}
            className="text-xs font-bold text-role-ink hover:underline"
          >
            {filtering
              ? allShownSelected
                ? `Quitar las ${shown.length} que coinciden`
                : `Seleccionar las ${shown.length} que coinciden`
              : allShownSelected
                ? 'Deseleccionar todas'
                : 'Seleccionar todas'}
          </button>
        )}
      </div>

      <SearchBox
        aria-label={`Buscar en ${label}`}
        placeholder="Escribe un nombre para encontrarla..."
        value={query}
        onChange={setQuery}
        onKeyDown={(e) => {
          // Enter marca o quita a la primera de la lista, y no envía el formulario.
          if (e.key === 'Enter') {
            e.preventDefault();
            if (shown[0]) toggle(shown[0].id);
          }
        }}
      />
      {filtering && (
        <p className="text-[11px] font-semibold text-slate-500" aria-live="polite">
          {shown.length === 0
            ? `Nadie se parece a «${query.trim()}».`
            : `${shown.length} ${shown.length === 1 ? 'coincidencia' : 'coincidencias'}, las más parecidas primero.`}
        </p>
      )}

      <ul
        aria-labelledby={`${id}-title`}
        className={cn(
          'divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2',
          maxHeightClass,
        )}
      >
        {options.length === 0 ? (
          <li className="p-2 text-xs text-slate-500">{emptyText}</li>
        ) : shown.length === 0 ? (
          <li className="p-2 text-xs text-slate-500">Prueba con otro nombre.</li>
        ) : (
          shown.map((option) => (
            <li key={option.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-xs hover:bg-role-soft">
                <Avatar avatarKey={option.avatar ?? null} fallbackInitial={option.name.charAt(0)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">
                    <Highlight text={option.name} query={query} />
                  </span>
                  {option.subtitle && (
                    <span className="block truncate text-[11px] text-slate-500">
                      <Highlight text={option.subtitle} query={query} />
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={selected.has(option.id)}
                  onChange={() => toggle(option.id)}
                  aria-label={option.name}
                  className="h-4 w-4 flex-shrink-0 rounded text-role-ink focus:ring-primary/40"
                />
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
