import { describe, expect, it } from 'vitest';
import { canChat, pairIds } from '@/lib/chat';
import { presenceForViewer, presenceOf } from '@/lib/presence';

const NOW = new Date('2026-09-28T15:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;

describe('presenceOf', () => {
  it('está en línea si la última actividad fue hace menos de 2 minutos', () => {
    expect(presenceOf(ago(30_000), true, NOW)).toEqual({ online: true, label: 'En línea' });
    expect(presenceOf(ago(2 * MIN), true, NOW).online).toBe(true);
    expect(presenceOf(ago(3 * MIN), true, NOW).online).toBe(false);
  });

  it('describe cuánto hace que estuvo activa', () => {
    expect(presenceOf(ago(15 * MIN), true, NOW).label).toBe('Activa hace 15 min');
    expect(presenceOf(ago(3 * 60 * MIN), true, NOW).label).toBe('Activa hace 3 h');
    expect(presenceOf(ago(30 * 60 * MIN), true, NOW).label).toBe('Activa ayer');
    expect(presenceOf(ago(5 * 24 * 60 * MIN), true, NOW).label).toMatch(/^Activa el /);
  });

  it('no muestra nada si oculta su estado o no hay actividad registrada', () => {
    expect(presenceOf(ago(MIN), false, NOW)).toEqual({ online: false, label: null });
    expect(presenceOf(null, true, NOW)).toEqual({ online: false, label: null });
    expect(presenceOf('no-es-fecha', true, NOW).label).toBeNull();
  });
});

describe('presenceForViewer', () => {
  const target = { lastSeenAt: ago(MIN), showOnlineStatus: true };

  it('reciprocidad: quien oculta su estado tampoco ve el de las demás', () => {
    expect(presenceForViewer({ isAdmin: false, showOnlineStatus: true }, target, NOW).online).toBe(true);
    expect(presenceForViewer({ isAdmin: false, showOnlineStatus: false }, target, NOW).label).toBeNull();
    expect(
      presenceForViewer({ isAdmin: false, showOnlineStatus: true }, { ...target, showOnlineStatus: false }, NOW).label,
    ).toBeNull();
  });

  it('la administración siempre lo ve', () => {
    expect(
      presenceForViewer({ isAdmin: true, showOnlineStatus: false }, { ...target, showOnlineStatus: false }, NOW).online,
    ).toBe(true);
  });
});

describe('chat', () => {
  it('cada pareja tiene un solo orden de ids', () => {
    expect(pairIds('b', 'a')).toEqual(['a', 'b']);
    expect(pairIds('a', 'b')).toEqual(['a', 'b']);
  });

  it('una persona menor solo conversa con mentores o con la administración', () => {
    const student = { isMinor: false, role: 'STUDENT', extraRoles: [] } as const;
    const minor = { isMinor: true, role: 'STUDENT', extraRoles: [] } as const;
    const mentor = { isMinor: false, role: 'MENTOR', extraRoles: [] } as const;
    const dual = { isMinor: false, role: 'STUDENT', extraRoles: ['MENTOR'] } as const;
    expect(canChat(student, student)).toBe(true);
    expect(canChat(minor, student)).toBe(false);
    expect(canChat(student, minor)).toBe(false);
    expect(canChat(minor, minor)).toBe(false);
    expect(canChat(minor, mentor)).toBe(true);
    expect(canChat(dual, minor)).toBe(true);
  });
});
