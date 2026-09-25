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

/** viernes, 25 de septiembre */
export const formatWeekdayDate = (value: DateInput) =>
  formatter({ weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(value));

/** 03:00 p. m. */
export const formatTime = (value: DateInput) => formatter({ hour: '2-digit', minute: '2-digit' }).format(toDate(value));

/** 03:00 p. m. - 05:00 p. m. */
export const formatTimeRange = (start: DateInput, end: DateInput) => `${formatTime(start)} - ${formatTime(end)}`;

/** viernes, 25 de septiembre de 2026 */
export const formatWeekdayDateLong = (value: DateInput) =>
  formatter({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(value));

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
