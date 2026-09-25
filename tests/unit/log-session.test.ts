import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as logout } from '@/app/api/auth/logout/route';
import { clearSessionCookie } from '@/lib/auth';
import { logError } from '@/lib/log';
import prisma from '@/lib/prisma';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';
import type * as LegalModule from '@/lib/legal';
import type { SessionUser } from '@/lib/user-context';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

describe('logError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra solo tipo, código y la primera línea del mensaje', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = Object.assign(new Error('Invalid invocation\nwhere: { email: "secreta@prueba.test" }'), {
      code: 'P2002',
    });
    logError('ambito', error);
    const printed = spy.mock.calls.flat().join(' ');
    expect(printed).toContain('[ambito]');
    expect(printed).toContain('P2002');
    expect(printed).toContain('Invalid invocation');
    expect(printed).not.toContain('secreta@prueba.test');
  });

  it('tolera valores que no son errores', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logError('ambito', null);
    logError('ambito', 'texto');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/auth/logout', () => {
  it('borra la cookie de sesión', async () => {
    const res = await read(await logout(request('/api/auth/logout', { method: 'POST' })));
    expect(res.status).toBe(200);
    expect(clearSessionCookie).toHaveBeenCalled();
  });
});

describe('sesión con perfil completo', () => {
  let w: Awaited<ReturnType<typeof createWorld>>;

  beforeEach(async () => {
    await resetDb();
    w = await createWorld();
    actAs(null);
    vi.resetModules();
  });

  const load = async (reviewCompleted: boolean) => {
    vi.doMock('@/lib/legal', async (importOriginal) => {
      const actual = await importOriginal<typeof LegalModule>();
      return { ...actual, LEGAL_REVIEW_COMPLETED: reviewCompleted };
    });
    return import('@/lib/session-profile');
  };

  it('devuelve null sin sesión y los datos completos con sesión', async () => {
    const { getSessionProfile } = await load(false);
    expect(await getSessionProfile()).toBeNull();

    await prisma.user.update({
      where: { id: w.sofia.id },
      data: { avatar: `avatares/${w.sofia.id}/f.png`, startDate: new Date('2026-01-01T00:00:00Z') },
    });
    actAs(w.sofia);
    const profile = await getSessionProfile();
    expect(profile).toMatchObject({
      id: w.sofia.id,
      documentId: 'DOC-Sofia',
      phone: '3000000000',
      avatar: `avatares/${w.sofia.id}/f.png`,
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: null,
      isMinor: false,
    });
  });

  const user = (override: Partial<SessionUser> = {}): SessionUser => ({
    id: 'u',
    name: 'N',
    email: 'n@n.co',
    role: 'STUDENT',
    status: 'ACTIVO',
    termsVersion: null,
    isMinor: false,
    guardianConsentAt: null,
    ...override,
  });

  it('mientras la revisión legal no esté completa no se exige la aceptación', async () => {
    const { requireAcceptedTerms } = await load(false);
    expect(() => requireAcceptedTerms(user())).not.toThrow();
  });

  it('con la revisión completa exige la versión vigente', async () => {
    const { requireAcceptedTerms } = await load(true);
    expect(() => requireAcceptedTerms(user())).toThrow('REDIRECT:/aceptar-terminos');
    expect(() => requireAcceptedTerms(user({ termsVersion: '1999-01-01' }))).toThrow('REDIRECT:/aceptar-terminos');
    expect(() => requireAcceptedTerms(user({ termsVersion: CURRENT_TERMS_VERSION }))).not.toThrow();
  });

  it('una persona menor necesita además la autorización de su representante', async () => {
    const { requireAcceptedTerms } = await load(true);
    const accepted = { termsVersion: CURRENT_TERMS_VERSION, isMinor: true };
    expect(() => requireAcceptedTerms(user(accepted))).toThrow('REDIRECT:/aceptar-terminos');
    expect(() => requireAcceptedTerms(user({ ...accepted, guardianConsentAt: '2026-09-01T00:00:00Z' }))).not.toThrow();
  });
});
