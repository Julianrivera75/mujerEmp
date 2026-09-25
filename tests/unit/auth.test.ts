import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as AuthModule from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createWorld, resetDb } from '../helpers/world';

const store = vi.hoisted(() => ({
  values: {} as Record<string, string>,
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (store.values[name] ? { value: store.values[name] } : undefined),
    set: store.set,
    delete: store.delete,
  }),
}));

const SECRET = 'secreto-solo-para-pruebas';
const COOKIE = 'empoderas_session';

let auth: typeof AuthModule;
let w: Awaited<ReturnType<typeof createWorld>>;

const tokenFor = (user: { id: string; email: string; name: string }, role = 'STUDENT', secret = SECRET, options = {}) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name, role, status: 'ACTIVO' }, secret, {
    expiresIn: '7d',
    ...options,
  });

beforeEach(async () => {
  auth = await vi.importActual<typeof AuthModule>('@/lib/auth');
  await resetDb();
  w = await createWorld();
  store.values = {};
  store.set.mockClear();
  store.delete.mockClear();
});

describe('signToken', () => {
  it('firma con el secreto del entorno y vence en 7 días', () => {
    const token = auth.signToken({ id: 'u1', email: 'a@b.co', role: 'ADMIN', name: 'A', status: 'ACTIVO' });
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    expect(decoded.id).toBe('u1');
    expect(decoded.role).toBe('ADMIN');
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(7 * 24 * 3600);
  });
});

describe('cookie de sesión', () => {
  it('se crea HttpOnly, SameSite=Lax, de 7 días y en toda la aplicación', () => {
    auth.setSessionCookie('token-x');
    expect(store.set).toHaveBeenCalledWith(
      COOKIE,
      'token-x',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 }),
    );
  });

  it('se borra al cerrar sesión', () => {
    auth.clearSessionCookie();
    expect(store.delete).toHaveBeenCalledWith(COOKIE);
  });
});

describe('getCurrentUser', () => {
  it('devuelve null sin cookie o con una cookie que no es un token', async () => {
    expect(await auth.getCurrentUser()).toBeNull();
    store.values[COOKIE] = 'basura';
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('rechaza un token firmado con otro secreto, sin firma o vencido', async () => {
    store.values[COOKIE] = tokenFor(w.sofia, 'STUDENT', 'otro-secreto');
    expect(await auth.getCurrentUser()).toBeNull();

    store.values[COOKIE] = jwt.sign({ id: w.sofia.id }, '', { algorithm: 'none' as jwt.Algorithm });
    expect(await auth.getCurrentUser()).toBeNull();

    store.values[COOKIE] = tokenFor(w.sofia, 'STUDENT', SECRET, { expiresIn: -10 });
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('devuelve la usuaria activa', async () => {
    store.values[COOKIE] = tokenFor(w.sofia);
    const user = await auth.getCurrentUser();
    expect(user).toMatchObject({ id: w.sofia.id, email: 'sofia@prueba.test', role: 'STUDENT', status: 'ACTIVO' });
  });

  it('toma el rol de la base de datos, no del token', async () => {
    store.values[COOKIE] = tokenFor(w.sofia, 'ADMIN');
    expect((await auth.getCurrentUser())?.role).toBe('STUDENT');

    await prisma.user.update({ where: { id: w.sofia.id }, data: { role: 'MENTOR' } });
    store.values[COOKIE] = tokenFor(w.sofia, 'STUDENT');
    expect((await auth.getCurrentUser())?.role).toBe('MENTOR');
  });

  it('rechaza una cuenta inactiva o eliminada aunque el token siga vigente', async () => {
    store.values[COOKIE] = tokenFor(w.sofia);
    await prisma.user.update({ where: { id: w.sofia.id }, data: { status: 'INACTIVO' } });
    expect(await auth.getCurrentUser()).toBeNull();

    await prisma.user.delete({ where: { id: w.lucia.id } });
    store.values[COOKIE] = tokenFor(w.lucia);
    expect(await auth.getCurrentUser()).toBeNull();
  });
});
