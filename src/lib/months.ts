const MONTH_FORMAT = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

export interface MonthOption {
  value: string;
  label: string;
  current: boolean;
}

export const monthKeyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Meses alrededor de la fecha dada (por defecto 6 hacia atrás y 6 hacia adelante). */
export function monthOptions(reference: Date = new Date(), before = 6, after = 6): MonthOption[] {
  const currentKey = monthKeyOf(reference);
  const options: MonthOption[] = [];
  for (let offset = -before; offset <= after; offset++) {
    const date = new Date(reference.getFullYear(), reference.getMonth() + offset, 1);
    const value = monthKeyOf(date);
    options.push({ value, label: capitalize(MONTH_FORMAT.format(date)), current: value === currentKey });
  }
  return options;
}

/** Valor de un input datetime-local (hora local, sin zona horaria). */
export function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
