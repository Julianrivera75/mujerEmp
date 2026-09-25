import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('permite hasta el límite y luego bloquea con tiempo de espera', () => {
    const key = 'prueba:limite';
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('libera la ventana cuando pasa el tiempo', () => {
    vi.useFakeTimers();
    const key = 'prueba:ventana';
    rateLimit(key, 1, 1000);
    expect(rateLimit(key, 1, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(rateLimit(key, 1, 1000).ok).toBe(true);
  });

  it('resetRateLimit borra el contador', () => {
    const key = 'prueba:reset';
    rateLimit(key, 1, 60_000);
    expect(rateLimit(key, 1, 60_000).ok).toBe(false);
    resetRateLimit(key);
    expect(rateLimit(key, 1, 60_000).ok).toBe(true);
  });

  it('llaves distintas no se afectan', () => {
    rateLimit('prueba:a', 1, 60_000);
    expect(rateLimit('prueba:a', 1, 60_000).ok).toBe(false);
    expect(rateLimit('prueba:b', 1, 60_000).ok).toBe(true);
  });
});

describe('getClientIp', () => {
  it('prefiere x-real-ip y, si no, toma la última entrada de x-forwarded-for', () => {
    expect(getClientIp(new Request('http://x', { headers: { 'x-real-ip': '1.1.1.1' } }))).toBe('1.1.1.1');
    expect(getClientIp(new Request('http://x', { headers: { 'x-forwarded-for': '9.9.9.9, 2.2.2.2' } }))).toBe(
      '2.2.2.2',
    );
    expect(getClientIp(new Request('http://x'))).toBe('unknown');
  });
});
