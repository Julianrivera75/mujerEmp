import { beforeEach, describe, expect, it } from 'vitest';
import { GET as classes } from '@/app/api/classes/route';
import { PUT as profile } from '@/app/api/auth/profile/route';
import { POST as skipPasswordChange } from '@/app/api/auth/skip-password-change/route';
import { GET as userProfile } from '@/app/api/users/profile/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, PASSWORD, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const send = (handler: (req: Request) => Promise<Response>, method: string, path: string, body?: unknown) =>
  handler(request(path, { method, body: body as Record<string, unknown> | undefined }));

describe('omitir el cambio de contraseña', () => {
  it('mientras está pendiente, la API la bloquea hasta que se omite; luego se puede usar la plataforma', async () => {
    await prisma.user.update({ where: { id: w.sofia.id }, data: { mustChangePassword: true } });
    actAs({ ...w.sofia, mustChangePassword: true });
    const blocked = await read(await classes(request('/api/classes')));
    expect(blocked.status).toBe(403);
    expect(blocked.body.mustChangePassword).toBe(true);

    const skip = await skipPasswordChange(request('/api/auth/skip-password-change', { method: 'POST' }));
    expect(skip.status).toBe(200);

    actAs({ ...w.sofia, mustChangePassword: true, pwdSkip: true });
    expect((await classes(request('/api/classes'))).status).toBe(200);
    // la cuenta sigue marcada: en el próximo ingreso se le recuerda otra vez
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).mustChangePassword).toBe(true);
  });

  it('quien no tiene el cambio pendiente no necesita omitir nada', async () => {
    actAs(w.sofia);
    expect((await classes(request('/api/classes'))).status).toBe(200);
  });

  it('la vista de omitir no queda en el token si de todas formas se cambia la contraseña', async () => {
    await prisma.user.update({ where: { id: w.sofia.id }, data: { mustChangePassword: true } });
    actAs({ ...w.sofia, mustChangePassword: true });
    const res = await send(profile, 'PUT', '/api/auth/profile', {
      currentPassword: PASSWORD,
      newPassword: 'otra-clave-larga-9',
    });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).mustChangePassword).toBe(false);
  });
});

describe('ocupación y redes sociales', () => {
  it('se guardan cuando son URLs https válidas y se limpian con un valor vacío', async () => {
    actAs(w.sofia);
    const res = await read(
      await send(profile, 'PUT', '/api/auth/profile', {
        occupation: '  Estudiante de Derecho  ',
        socialLinks: { instagram: 'https://instagram.com/sofia', facebook: '' },
      }),
    );
    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.occupation).toBe('Estudiante de Derecho');
    expect(saved.socialLinks).toEqual({ instagram: 'https://instagram.com/sofia' });
  });

  it('rechaza un enlace que no sea una URL https y una clave de red desconocida', async () => {
    actAs(w.sofia);
    expect((await send(profile, 'PUT', '/api/auth/profile', { socialLinks: { instagram: 'no-es-url' } })).status).toBe(
      400,
    );
    expect(
      (await send(profile, 'PUT', '/api/auth/profile', { socialLinks: { instagram: 'http://x.com' } })).status,
    ).toBe(400);
    expect(
      (await send(profile, 'PUT', '/api/auth/profile', { socialLinks: { tiktok: 'https://tiktok.com/@x' } })).status,
    ).toBe(400);
  });
});

describe('perfil de otra persona muestra correo y número', () => {
  it('cualquier persona con sesión ve el correo, el número, la ocupación y las redes de otra', async () => {
    await prisma.user.update({
      where: { id: w.carolina.id },
      data: { occupation: 'Mentora y abogada', socialLinks: { linkedin: 'https://linkedin.com/in/carolina' } },
    });
    actAs(w.sofia);
    const res = await read(await userProfile(request(`/api/users/profile?id=${w.carolina.id}`)));
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      email: 'carolina@prueba.test',
      memberNumber: 'DOC-Carolina',
      occupation: 'Mentora y abogada',
      socialLinks: { linkedin: 'https://linkedin.com/in/carolina' },
    });
    expect(res.body.profile).not.toHaveProperty('phone');
  });
});
