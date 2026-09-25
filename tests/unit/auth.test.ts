import { decodeJwt, jwtVerify, SignJWT } from 'jose';
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

const encode = (value: string) => new TextEncoder().encode(value);

const tokenFor = (
  user: { id: string; email: string; name: string },
  role = 'STUDENT',
  secret = SECRET,
  expiresIn: string | number = '7d',
) =>
  new SignJWT({ id: user.id, email: user.email, name: user.name, role, status: 'ACTIVO' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encode(secret));

/** Token sin firma (alg "none"), el ataque clásico contra las librerías JWT. */
const unsigned = (id: string) => {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'none', typ: 'JWT' })}.${part({ id })}.`;
};

beforeEach(async () => {
  auth = await vi.importActual<typeof AuthModule>('@/lib/auth');
  await resetDb();
  w = await createWorld();
  store.values = {};
  store.set.mockClear();
  store.delete.mockClear();
});

describe('signToken', () => {
  it('firma con el secreto del entorno (HS256) y vence en 7 días', async () => {
    const token = await auth.signToken({ id: 'u1', email: 'a@b.co', role: 'ADMIN', name: 'A', status: 'ACTIVO' });
    const { payload, protectedHeader } = await jwtVerify(token, encode(SECRET));
    expect(protectedHeader.alg).toBe('HS256');
    expect(payload.id).toBe('u1');
    expect(payload.role).toBe('ADMIN');
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(7 * 24 * 3600);
    expect(decodeJwt(token).email).toBe('a@b.co');
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
    store.values[COOKIE] = await tokenFor(w.sofia, 'STUDENT', 'otro-secreto');
    expect(await auth.getCurrentUser()).toBeNull();

    store.values[COOKIE] = unsigned(w.sofia.id);
    expect(await auth.getCurrentUser()).toBeNull();

    store.values[COOKIE] = await tokenFor(w.sofia, 'STUDENT', SECRET, Math.floor(Date.now() / 1000) - 10);
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('devuelve la usuaria activa', async () => {
    store.values[COOKIE] = await tokenFor(w.sofia);
    const user = await auth.getCurrentUser();
    expect(user).toMatchObject({ id: w.sofia.id, email: 'sofia@prueba.test', role: 'STUDENT', status: 'ACTIVO' });
  });

  it('toma el rol de la base de datos, no del token', async () => {
    store.values[COOKIE] = await tokenFor(w.sofia, 'ADMIN');
    expect((await auth.getCurrentUser())?.role).toBe('STUDENT');

    await prisma.user.update({ where: { id: w.sofia.id }, data: { role: 'MENTOR' } });
    store.values[COOKIE] = await tokenFor(w.sofia, 'STUDENT');
    expect((await auth.getCurrentUser())?.role).toBe('MENTOR');
  });

  it('rechaza una cuenta inactiva o eliminada aunque el token siga vigente', async () => {
    store.values[COOKIE] = await tokenFor(w.sofia);
    await prisma.user.update({ where: { id: w.sofia.id }, data: { status: 'INACTIVO' } });
    expect(await auth.getCurrentUser()).toBeNull();

    await prisma.user.delete({ where: { id: w.lucia.id } });
    store.values[COOKIE] = await tokenFor(w.lucia);
    expect(await auth.getCurrentUser()).toBeNull();
  });
});
