const LOCALE = 'es-CO';

type DateInput = Date | string | number;

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, options);
    cache.set(key, f);
  }
  return f;
}

/** 25/09/2026 */
export const formatDate = (value: DateInput) => formatter({}).format(toDate(value));

/** 25 sept 2026 */
const formatDateShort = (value: DateInput) =>
  formatter({ day: '2-digit', month: 'short', year: 'numeric' }).format(toDate(value));

/** 25 de septiembre */
const formatDayMonth = (value: DateInput) => formatter({ day: 'numeric', month: 'long' }).format(toDate(value));

/** 25 sept */
export const formatDayMonthShort = (value: DateInput) =>
  formatter({ day: 'numeric', month: 'short' }).format(toDate(value));

/** 25 de septiembre de 2026 */
export const formatDateLong = (value: DateInput) =>
  formatter({ day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(value));

/** Solo la primera letra en mayúscula: "Viernes, 25 de septiembre". */
export const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Viernes, 25 de septiembre */
export const formatWeekdayDate = (value: DateInput) =>
  upperFirst(formatter({ weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(value)));

/** 03:00 p. m. */
export const formatTime = (value: DateInput) => formatter({ hour: '2-digit', minute: '2-digit' }).format(toDate(value));

/** 03:00 p. m. - 05:00 p. m. */
export const formatTimeRange = (start: DateInput, end: DateInput) => `${formatTime(start)} - ${formatTime(end)}`;

/** Viernes, 25 de septiembre de 2026 */
export const formatWeekdayDateLong = (value: DateInput) =>
  upperFirst(formatter({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(value)));

/** vie, 25 de septiembre, 03:00 p. m. */
export const formatDue = (value: DateInput) =>
  formatter({ weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(
    toDate(value),
  );

/** 03:00:15 p. m. */
export const formatTimeSeconds = (value: DateInput) =>
  formatter({ hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(toDate(value));

/** 25 sept a las 03:00 p. m. */
export const formatDayMonthTime = (value: DateInput) =>
  `${formatter({ day: '2-digit', month: 'short' }).format(toDate(value))} a las ${formatTime(value)}`;

/** 25 de septiembre a las 03:00 p. m. */
export const formatDayMonthLongTime = (value: DateInput) => `${formatDayMonth(value)} a las ${formatTime(value)}`;

/** 25 sept 2026 a las 03:00:15 p. m. */
export const formatDateTimeSeconds = (value: DateInput) =>
  `${formatDateShort(value)} a las ${formatTimeSeconds(value)}`;

/** Convierte el valor de un input `date` (AAAA-MM-DD) o `datetime-local` (AAAA-MM-DDThh:mm) en una fecha local. */
function parseInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Describe en palabras el valor de un campo de fecha, para confirmar sin ambigüedad qué día y mes se eligieron
 * (por ejemplo "lunes, 5 de octubre de 2026 · 03:00 p. m."). Devuelve null si el valor está vacío o es inválido.
 */
export function describeInputDate(value: string, withTime: boolean): string | null {
  const date = parseInputValue(value);
  if (!date) return null;
  const day = formatWeekdayDateLong(date);
  return withTime ? `${day} · ${formatTime(date)}` : day;
}
