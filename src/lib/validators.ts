export const ROLES = ['ADMIN', 'MENTOR', 'STUDENT'] as const;
export const USER_STATUSES = ['ACTIVO', 'INACTIVO'] as const;
export const CLASS_STATUSES = ['PROGRAMADA', 'FINALIZADA', 'CANCELADA'] as const;
export const RESOURCE_TYPES = ['YOUTUBE', 'DOCUMENT', 'LINK'] as const;
export const SUBMISSION_FILE_TYPES = ['PDF', 'IMAGE', 'DOC', 'LINK'] as const;
export const CERTIFICATE_RULE_TYPES = ['MIN_ATTENDANCE_PERCENT', 'MIN_ATTENDED_DAYS'] as const;

export const MEET_HOSTS = ['meet.google.com'];
export const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be', 'youtube-nocookie.com'];

const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  'password',
  'password1',
  'contraseña',
  'qwertyui',
  'qwerty123',
  'abc12345',
  'empoderas',
  'empoderas123',
  'iloveyou',
]);

export function isOneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** Devuelve el mensaje de error si la contraseña no cumple la política, o null si es válida. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'La contraseña es obligatoria.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Esa contraseña es demasiado común. Elige una más difícil de adivinar.';
  }
  return null;
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

function hostMatches(hostname: string, hosts: string[]): boolean {
  const h = hostname.toLowerCase();
  return hosts.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
}

/**
 * Acepta únicamente URLs https (y, opcionalmente, de una lista de dominios).
 * Devuelve la URL normalizada o null. Bloquea javascript:, data:, http:, etc.
 */
export function parseHttpsUrl(value: unknown, allowedHosts?: string[]): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (allowedHosts && !hostMatches(url.hostname, allowedHosts)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Defensa en el cliente: solo permite enlaces https al renderizar datos ya guardados. */
export function safeHref(value: string | null | undefined): string | undefined {
  return parseHttpsUrl(value ?? '') ?? undefined;
}

const URL_IN_TEXT = /https:\/\/[^\s<>"']+/g;

/**
 * URLs https válidas y únicas dentro de un bloque de texto libre (p. ej. la descripción de una
 * tarea donde alguien pegó un enlace). Sirve para ofrecer un botón de "abrir enlace" además del
 * texto, pensado para quien no sabe copiar y pegar una URL.
 */
export function extractHttpsUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of text.match(URL_IN_TEXT) ?? []) {
    // Quita puntuación final que probablemente no es parte de la URL (un punto de cierre, una coma, etc.).
    const cleaned = match.replace(/[),.;:!?]+$/, '');
    const valid = parseHttpsUrl(cleaned);
    if (valid && !seen.has(valid)) {
      seen.add(valid);
      result.push(valid);
    }
  }
  return result;
}

/**
 * El texto sin las URLs (ya se ofrecen como botón aparte con `extractHttpsUrls`): evita mostrar la
 * dirección pelada y fea dentro del párrafo. Si no queda nada más que espacios, devuelve cadena vacía.
 */
export function stripHttpsUrls(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(URL_IN_TEXT, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Teléfono internacional flexible: dígitos, espacios, guiones, puntos, paréntesis y un "+" inicial (7 a 25 caracteres). */
export function isValidPhone(value: string): boolean {
  return /^\+?[\d\s().-]{7,25}$/.test(value) && (value.match(/\d/g) ?? []).length >= 7;
}
