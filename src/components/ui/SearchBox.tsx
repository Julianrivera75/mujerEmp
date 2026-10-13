'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Field';

interface SearchBoxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
}

/** Cuadro de búsqueda con lupa y botón para borrar lo escrito. */
export const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ value, onChange, label, hint, placeholder = 'Buscar por nombre...', ...rest }, ref) => (
    <Input
      ref={ref}
      type="search"
      autoComplete="off"
      label={label}
      hint={hint}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      leftIcon={<Search className="h-4 w-4" />}
      rightSlot={
        value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Borrar la búsqueda"
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
      {...rest}
    />
  ),
);
SearchBox.displayName = 'SearchBox';
