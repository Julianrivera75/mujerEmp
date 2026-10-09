'use client';

import React, { useEffect, useId, useState } from 'react';
import { Select } from './Field';
import { describeInputDate } from '@/lib/format';

interface DateFieldProps {
  label: string;
  /** `date` para solo la fecha; `datetime` para fecha y hora. */
  kind?: 'date' | 'datetime';
  /** AAAA-MM-DD (date) o AAAA-MM-DDThh:mm (datetime); vacío mientras la fecha esté incompleta. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Texto de ayuda que se muestra cuando aún no hay una fecha completa. */
  help?: string;
  /** Mensaje de error de la validación del formulario; reemplaza a la ayuda. */
  error?: string;
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface Parts {
  month: string; // 1-12
  day: string; // 1-31
  year: string;
  hour: string; // 1-12
  minute: string; // 0-59
  meridiem: '' | 'AM' | 'PM';
}

const EMPTY: Parts = { month: '', day: '', year: '', hour: '', minute: '', meridiem: '' };

const pad = (n: number | string) => String(n).padStart(2, '0');

function partsFromValue(value: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!m) return null;
  const hour24 = m[4] === undefined ? null : Number(m[4]);
  return {
    year: m[1],
    month: String(Number(m[2])),
    day: String(Number(m[3])),
    hour: hour24 === null ? '' : String(hour24 % 12 === 0 ? 12 : hour24 % 12),
    minute: m[5] === undefined ? '' : String(Number(m[5])),
    meridiem: hour24 === null ? '' : hour24 >= 12 ? 'PM' : 'AM',
  };
}

function valueFromParts(parts: Parts, withTime: boolean): string {
  const { year, month, day } = parts;
  if (!year || !month || !day) return '';
  const date = `${year}-${pad(month)}-${pad(day)}`;
  if (!withTime) return date;
  if (!parts.hour || parts.minute === '' || !parts.meridiem) return '';
  const hour12 = Number(parts.hour) % 12;
  const hour24 = parts.meridiem === 'PM' ? hour12 + 12 : hour12;
  return `${date}T${pad(hour24)}:${pad(parts.minute)}`;
}

const daysInMonth = (year: string, month: string) => new Date(Number(year) || 2026, Number(month) || 1, 0).getDate();

/**
 * Fecha (y hora) elegida con listas de Mes, Día y Año, sin depender del formato del navegador:
 * nadie tiene que adivinar si el primer número es el mes o el día. Confirma la elección en palabras.
 */
export function DateField({ label, kind = 'date', value, onChange, required, help, error }: DateFieldProps) {
  const withTime = kind === 'datetime';
  const legendId = useId();
  const [parts, setParts] = useState<Parts>(() => partsFromValue(value) ?? EMPTY);

  // Si el valor cambia desde fuera (por ejemplo, al abrir el formulario con otra clase), se refleja.
  useEffect(() => {
    if (value === valueFromParts(parts, withTime)) return;
    setParts(partsFromValue(value) ?? EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch };
    // Si el día elegido no existe en el mes (por ejemplo, 31 de abril), se ajusta al último día.
    if (next.day && next.month) {
      const max = daysInMonth(next.year, next.month);
      if (Number(next.day) > max) next.day = String(max);
    }
    setParts(next);
    onChange(valueFromParts(next, withTime));
  };

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - 1 + i);
  if (parts.year && !years.includes(Number(parts.year))) years.push(Number(parts.year));
  years.sort((a, b) => a - b);

  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  if (parts.minute !== '' && !minutes.includes(Number(parts.minute))) minutes.push(Number(parts.minute));
  minutes.sort((a, b) => a - b);

  const described = describeInputDate(value, withTime);

  return (
    <fieldset className="space-y-1.5" aria-labelledby={legendId}>
      <legend id={legendId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-role-ink">*</span>}
      </legend>

      <div className="grid grid-cols-[1.6fr_1fr_1.1fr] gap-2">
        <Select
          aria-label={`${label}: mes`}
          value={parts.month}
          required={required}
          onChange={(e) => update({ month: e.target.value })}
        >
          <option value="">Mes</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          aria-label={`${label}: día`}
          value={parts.day}
          required={required}
          onChange={(e) => update({ day: e.target.value })}
        >
          <option value="">Día</option>
          {Array.from({ length: daysInMonth(parts.year, parts.month) }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          aria-label={`${label}: año`}
          value={parts.year}
          required={required}
          onChange={(e) => update({ year: e.target.value })}
        >
          <option value="">Año</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      {withTime && (
        <div className="grid grid-cols-3 gap-2">
          <Select
            aria-label={`${label}: hora`}
            value={parts.hour}
            required={required}
            onChange={(e) => update({ hour: e.target.value })}
          >
            <option value="">Hora</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={String(h)}>
                {h}
              </option>
            ))}
          </Select>
          <Select
            aria-label={`${label}: minutos`}
            value={parts.minute}
            required={required}
            onChange={(e) => update({ minute: e.target.value })}
          >
            <option value="">Min</option>
            {minutes.map((m) => (
              <option key={m} value={String(m)}>
                {pad(m)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={`${label}: a. m. o p. m.`}
            value={parts.meridiem}
            required={required}
            onChange={(e) => update({ meridiem: e.target.value as Parts['meridiem'] })}
          >
            <option value="">AM/PM</option>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </Select>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : (
        <p className="text-xs text-slate-500" aria-live="polite">
          {described
            ? `Elegiste: ${described}`
            : (help ?? (withTime ? 'Elige el mes, el día, el año y la hora.' : 'Elige el mes, el día y el año.'))}
        </p>
      )}
    </fieldset>
  );
}
