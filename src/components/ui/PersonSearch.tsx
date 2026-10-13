'use client';

import React, { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Highlight } from '@/components/ui/Highlight';
import { cn } from '@/lib/cn';
import { rankMatches } from '@/lib/text-search';

export interface PersonOption {
  id: string;
  name: string;
  /** Línea secundaria: correo, rol... También se busca en ella. */
  subtitle?: string;
  avatar?: string | null;
}

interface PersonSearchProps {
  label: string;
  options: readonly PersonOption[];
  /** Id de la persona elegida, o null. */
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Se puede dejar sin elegir (muestra el botón para borrar). */
  clearable?: boolean;
}

const MAX_SUGGESTIONS = 50;

/**
 * Elegir a UNA persona escribiendo su nombre: mientras se escribe sale la lista de quienes más se parecen (sin
 * importar tildes ni mayúsculas). Funciona con teclado (flechas, Enter, Esc) y dentro de ventanas emergentes.
 */
export function PersonSearch({
  label,
  options,
  value,
  onChange,
  placeholder = 'Escribe un nombre...',
  hint,
  error,
  required,
  disabled,
  clearable,
}: PersonSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.id === value) ?? null;
  const suggestions = useMemo(
    () =>
      rankMatches(options, query, (o) => [o.name, o.subtitle ?? ''])
        .slice(0, MAX_SUGGESTIONS)
        .map((r) => r.item),
    [options, query],
  );
  const hidden = Math.max(
    0,
    rankMatches(options, query, (o) => [o.name, o.subtitle ?? '']).length - suggestions.length,
  );

  const choose = (option: PersonOption) => {
    onChange(option.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Dentro de un formulario, Enter no debe enviarlo: solo elige la sugerencia marcada.
      e.preventDefault();
      if (open && suggestions[active]) choose(suggestions[active]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-role-ink">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && suggestions[active] ? `${id}-opt-${suggestions[active].id}` : undefined}
          aria-invalid={Boolean(error) || undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={selected && !open ? selected.name : placeholder}
          value={open ? query : (selected?.name ?? '')}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setQuery('');
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'h-11 w-full rounded-xl border bg-white/70 px-3.5 pr-16 text-base text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-role-from focus:ring-2 focus:ring-primary/20 disabled:opacity-60 sm:text-sm',
            error ? 'border-rose-400' : 'border-slate-200',
          )}
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {clearable && selected && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(null)}
              aria-label={`Quitar a ${selected.name}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="pointer-events-none h-4 w-4 text-slate-500" aria-hidden="true" />
        </span>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Sugerencias para ${label}`}
          className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-soft"
        >
          {suggestions.length === 0 ? (
            <li role="option" aria-selected={false} aria-disabled="true" className="px-3 py-2.5 text-xs text-slate-500">
              {query.trim() ? `Nadie se parece a «${query.trim()}».` : 'No hay personas para elegir.'}
            </li>
          ) : (
            suggestions.map((option, index) => (
              <li
                key={option.id}
                id={`${id}-opt-${option.id}`}
                role="option"
                aria-selected={option.id === value}
                // Con mousedown no se pierde el foco del cuadro antes de elegir.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2',
                  index === active && 'bg-role-soft',
                  option.id === value && 'font-bold',
                )}
              >
                <Avatar avatarKey={option.avatar ?? null} fallbackInitial={option.name.charAt(0)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800">
                    <Highlight text={option.name} query={query} />
                  </span>
                  {option.subtitle && (
                    <span className="block truncate text-[11px] text-slate-500">
                      <Highlight text={option.subtitle} query={query} />
                    </span>
                  )}
                </span>
              </li>
            ))
          )}
          {hidden > 0 && (
            <li aria-hidden="true" className="px-3 py-2 text-center text-[11px] text-slate-500">
              {hidden} más: sigue escribiendo para afinar.
            </li>
          )}
        </ul>
      )}

      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
