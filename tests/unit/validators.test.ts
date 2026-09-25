import { describe, expect, it } from 'vitest';
import {
  MEET_HOSTS,
  YOUTUBE_HOSTS,
  cleanText,
  isOneOf,
  isValidEmail,
  parseDate,
  parseHttpsUrl,
  safeHref,
  validatePassword,
} from '@/lib/validators';

describe('parseHttpsUrl', () => {
  it('acepta https válido y lo normaliza', () => {
    expect(parseHttpsUrl('https://drive.google.com/file/d/1')).toBe('https://drive.google.com/file/d/1');
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['http://meet.google.com/abc'],
    ['ftp://ejemplo.com/a'],
    ['https://usuario:clave@ejemplo.com/'],
    [''],
    ['no es una url'],
  ])('rechaza %s', (value) => {
    expect(parseHttpsUrl(value)).toBeNull();
  });

  it('rechaza valores que no son texto y URLs demasiado largas', () => {
    expect(parseHttpsUrl(undefined)).toBeNull();
    expect(parseHttpsUrl(42)).toBeNull();
    expect(parseHttpsUrl(`https://ejemplo.com/${'a'.repeat(2100)}`)).toBeNull();
  });

  it('respeta la lista de dominios permitidos', () => {
    expect(parseHttpsUrl('https://meet.google.com/abc-defg-hij', MEET_HOSTS)).not.toBeNull();
    expect(parseHttpsUrl('https://meet.google.com.evil.com/x', MEET_HOSTS)).toBeNull();
    expect(parseHttpsUrl('https://evil.com/meet.google.com', MEET_HOSTS)).toBeNull();
    expect(parseHttpsUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', YOUTUBE_HOSTS)).not.toBeNull();
    expect(parseHttpsUrl('https://vimeo.com/1', YOUTUBE_HOSTS)).toBeNull();
  });
});

describe('safeHref', () => {
  it('devuelve el enlace https y descarta el resto', () => {
    expect(safeHref('https://ejemplo.com/a')).toBe('https://ejemplo.com/a');
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('rechaza contraseñas cortas, largas y comunes', () => {
    expect(validatePassword('abc123')).not.toBeNull();
    expect(validatePassword('a'.repeat(129))).not.toBeNull();
    expect(validatePassword('12345678')).not.toBeNull();
    expect(validatePassword('Password')).not.toBeNull();
    expect(validatePassword(undefined)).not.toBeNull();
  });

  it('acepta una contraseña razonable', () => {
    expect(validatePassword('correcto-caballo-batería')).toBeNull();
  });
});

describe('utilidades', () => {
  it('isOneOf comprueba pertenencia y tipo', () => {
    expect(isOneOf(['A', 'B'] as const, 'A')).toBe(true);
    expect(isOneOf(['A', 'B'] as const, 'C')).toBe(false);
    expect(isOneOf(['A', 'B'] as const, 1)).toBe(false);
  });

  it('isValidEmail', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('sin-arroba')).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@b.co`)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it('parseDate', () => {
    expect(parseDate('2026-09-18T15:00')).toBeInstanceOf(Date);
    expect(parseDate('no fecha')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate(5)).toBeNull();
  });

  it('cleanText recorta y limita el largo', () => {
    expect(cleanText('  hola  ', 10)).toBe('hola');
    expect(cleanText('abcdef', 3)).toBe('abc');
    expect(cleanText('   ', 10)).toBeNull();
    expect(cleanText(7, 10)).toBeNull();
  });
});
