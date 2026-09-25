import { beforeEach, describe, expect, it } from 'vitest';
import { POST as acceptTerms } from '@/app/api/auth/accept-terms/route';
import { GET as exportData } from '@/app/api/auth/export/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/auth/me/route';
import { PUT as updateProfile } from '@/app/api/auth/profile/route';
import { GET as health } from '@/app/api/health/route';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';
import prisma from '@/lib/prisma';
import { verifyUploadedObject } from '@/lib/s3';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, PASSWORD, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;
let ipCounter = 0;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

/** Cada intento usa una IP distinta para que el límite de una prueba no afecte a otra. */
const tryLogin = (email: string, password: string, ip = `10.0.0.${++ipCounter}`) =>
  login(request('/api/auth/login', { method: 'POST', body: { email, password }, headers: { 'x-real-ip': ip } }));

describe('POST /api/auth/login', () => {
  it('inicia sesión y redirige según el rol', async () => {
    const student = await read(await tryLogin('sofia@prueba.test', PASSWORD));
    expect(student.status).toBe(200);
    expect(student.body.redirectUrl).toBe('/estudiante');
    expect((await read(await tryLogin('carolina@prueba.test', PASSWORD))).body.redirectUrl).toBe('/mentor');
    expect((await read(await tryLogin('ADMIN@prueba.test ', PASSWORD))).body.redirectUrl).toBe('/admin');
  });

  it('responde igual con un correo inexistente y con una contraseña incorrecta', async () => {
    const unknown = await read(await tryLogin('nadie@prueba.test', 'cualquiera-1234'));
    const wrong = await read(await tryLogin('sofia@prueba.test', 'cualquiera-1234'));
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('no revela que una cuenta está inactiva si la contraseña es incorrecta', async () => {
    await prisma.user.update({ where: { id: w.sofia.id }, data: { status: 'INACTIVO' } });
    const wrong = await read(await tryLogin('sofia@prueba.test', 'incorrecta-1234'));
    expect(wrong.status).toBe(401);
    expect(wrong.raw).not.toContain('inactiva');

    const right = await read(await tryLogin('sofia@prueba.test', PASSWORD));
    expect(right.status).toBe(403);
    expect(right.body.inactive).toBe(true);
  });

  it('respeta el periodo de vigencia solo tras validar la contraseña', async () => {
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    await prisma.user.update({ where: { id: w.sofia.id }, data: { endDate: past } });
    await prisma.user.update({ where: { id: w.lucia.id }, data: { startDate: future } });
    expect((await read(await tryLogin('sofia@prueba.test', PASSWORD))).status).toBe(403);
    expect((await read(await tryLogin('lucia@prueba.test', PASSWORD))).status).toBe(403);
    expect((await read(await tryLogin('sofia@prueba.test', 'incorrecta-1234'))).status).toBe(401);
  });

  it('valida el cuerpo de la solicitud', async () => {
    const bad = await login(new Request('http://localhost/api/auth/login', { method: 'POST', body: 'no es json' }));
    expect(bad.status).toBe(400);
    const missing = await read(await login(request('/api/auth/login', { method: 'POST', body: { email: 'a@b.co' } })));
    expect(missing.status).toBe(400);
    const long = await read(await tryLogin('sofia@prueba.test', 'x'.repeat(200)));
    expect(long.status).toBe(401);
  });

  it('bloquea con 429 tras demasiados intentos fallidos desde la misma IP y cuenta', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await tryLogin('sofia@prueba.test', 'incorrecta-1234', '203.0.113.9')).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
    const blocked = await tryLogin('sofia@prueba.test', PASSWORD, '203.0.113.9');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
  });

  it('un inicio de sesión correcto reinicia el contador de la cuenta', async () => {
    const ip = '203.0.113.20';
    for (let i = 0; i < 3; i++) await tryLogin('lucia@prueba.test', 'incorrecta-1234', ip);
    expect((await tryLogin('lucia@prueba.test', PASSWORD, ip)).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await tryLogin('lucia@prueba.test', 'incorrecta-1234', ip)).status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('rechaza a una persona anónima y devuelve solo los datos propios', async () => {
    expect((await read(await me(request('/api/auth/me')))).status).toBe(401);
    actAs(w.sofia);
    const res = await read(await me(request('/api/auth/me')));
    expect(res.body.user.email).toBe('sofia@prueba.test');
    expect(res.raw).not.toContain('passwordHash');
  });
});

describe('PUT /api/auth/profile', () => {
  const put = (body: Record<string, unknown>) => updateProfile(request('/api/auth/profile', { method: 'PUT', body }));

  it('rechaza a una persona anónima', async () => {
    expect((await read(await put({ phone: '1' }))).status).toBe(401);
  });

  it('actualiza el teléfono', async () => {
    actAs(w.sofia);
    expect((await read(await put({ phone: ' 3111111111 ' }))).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).phone).toBe('3111111111');
  });

  it('el cambio de contraseña exige la actual y cumplir la política', async () => {
    actAs(w.sofia);
    expect((await read(await put({ newPassword: 'una-clave-nueva-1' }))).status).toBe(400);
    expect((await read(await put({ newPassword: 'una-clave-nueva-1', currentPassword: 'incorrecta' }))).status).toBe(
      400,
    );
    expect((await read(await put({ newPassword: '123', currentPassword: PASSWORD }))).status).toBe(400);
    expect((await read(await put({ newPassword: 'una-clave-nueva-1', currentPassword: PASSWORD }))).status).toBe(200);
    expect((await read(await tryLogin('sofia@prueba.test', 'una-clave-nueva-1'))).status).toBe(200);
  });

  it('solo acepta una foto propia que exista en el almacenamiento', async () => {
    actAs(w.sofia);
    expect((await read(await put({ avatar: `avatares/${w.lucia.id}/foto.png` }))).status).toBe(400);
    expect((await read(await put({ avatar: 'https://evil.com/x.png' }))).status).toBe(400);
    expect((await read(await put({ avatar: `avatares/${w.sofia.id}/../${w.lucia.id}/x.png` }))).status).toBe(400);

    mockVerifyOnce(false);
    expect((await read(await put({ avatar: `avatares/${w.sofia.id}/foto.png` }))).status).toBe(400);
    mockVerifyOnce(true);

    const ok = await read(await put({ avatar: `avatares/${w.sofia.id}/foto.png` }));
    expect(ok.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).avatar).toBe(
      `avatares/${w.sofia.id}/foto.png`,
    );
  });

  it('permite quitar la foto', async () => {
    await prisma.user.update({ where: { id: w.sofia.id }, data: { avatar: `avatares/${w.sofia.id}/foto.png` } });
    actAs(w.sofia);
    expect((await read(await put({ avatar: null }))).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).avatar).toBeNull();
  });
});

function mockVerifyOnce(value: boolean) {
  (verifyUploadedObject as unknown as { mockResolvedValueOnce: (v: boolean) => void }).mockResolvedValueOnce(value);
}

describe('GET /api/auth/export', () => {
  it('rechaza a una persona anónima', async () => {
    expect((await read(await exportData(request('/api/auth/export')))).status).toBe(401);
  });

  it('entrega como descarga solo los datos de la propia persona', async () => {
    actAs(w.sofia);
    const res = await exportData(request('/api/auth/export'));
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const { raw, body } = await read(res);
    expect(body.data.email).toBe('sofia@prueba.test');
    expect(body.data.submissions).toHaveLength(1);
    expect(raw).not.toContain('lucia@prueba.test');
    expect(raw).not.toContain('passwordHash');
  });
});

describe('POST /api/auth/accept-terms', () => {
  const accept = (body: Record<string, unknown>) =>
    acceptTerms(request('/api/auth/accept-terms', { method: 'POST', body }));

  it('rechaza a una persona anónima y una versión distinta', async () => {
    expect((await read(await accept({ version: CURRENT_TERMS_VERSION }))).status).toBe(401);
    actAs(w.sofia);
    expect((await read(await accept({ version: '1999-01-01' }))).status).toBe(409);
  });

  it('registra la fecha y la versión aceptadas', async () => {
    actAs(w.sofia);
    expect((await read(await accept({ version: CURRENT_TERMS_VERSION }))).status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(saved.termsAcceptedAt).not.toBeNull();
  });

  it('una persona menor no acepta hasta que exista la autorización de su representante', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { isMinor: true } });
    actAs(w.lucia);
    expect((await read(await accept({ version: CURRENT_TERMS_VERSION }))).status).toBe(403);

    await prisma.user.update({ where: { id: w.lucia.id }, data: { guardianConsentAt: new Date() } });
    expect((await read(await accept({ version: CURRENT_TERMS_VERSION }))).status).toBe(200);
  });
});

describe('GET /api/health', () => {
  it('confirma que la aplicación llega a la base de datos', async () => {
    const res = await read(await health());
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
