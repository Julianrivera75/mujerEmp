export const ROLES = ['ADMIN', 'MENTOR', 'STUDENT'] as const;
export const USER_STATUSES = ['ACTIVO', 'INACTIVO'] as const;
export const CLASS_STATUSES = ['PROGRAMADA', 'FINALIZADA', 'CANCELADA'] as const;
export const RESOURCE_TYPES = ['YOUTUBE', 'DOCUMENT', 'LINK'] as const;
export const SUBMISSION_FILE_TYPES = ['PDF', 'IMAGE', 'LINK'] as const;

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
