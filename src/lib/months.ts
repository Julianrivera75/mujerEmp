/** Zona horaria de la organización (Miami). Los meses de las clases se calculan siempre en esta zona. */
const ORG_TIME_ZONE = 'America/New_York';

const MONTH_FORMAT = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export interface MonthOption {
  value: string;
  label: string;
  current: boolean;
}

const monthParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
  };
};

const toKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/** Mes (AAAA-MM) de un instante, en la zona horaria indicada. Igual en el servidor y en el navegador. */
export function monthKeyOf(date: Date, timeZone: string = ORG_TIME_ZONE): string {
  const { year, month } = monthParts(date, timeZone);
  return toKey(year, month);
}

/** Día (AAAA-MM-DD) de un instante, en la zona horaria de la organización. */
export function dayKeyOf(date: Date, timeZone: string = ORG_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Meses alrededor de la fecha dada (por defecto 6 hacia atrás y 6 hacia adelante). */
export function monthOptions(reference: Date = new Date(), before = 6, after = 6): MonthOption[] {
  const { year, month } = monthParts(reference, ORG_TIME_ZONE);
  const currentKey = toKey(year, month);
  const options: MonthOption[] = [];
  for (let offset = -before; offset <= after; offset++) {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const value = toKey(first.getUTCFullYear(), first.getUTCMonth() + 1);
    options.push({ value, label: capitalize(MONTH_FORMAT.format(first)), current: value === currentKey });
  }
  return options;
}

/** Valor de un input datetime-local (hora local, sin zona horaria). */
export function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
