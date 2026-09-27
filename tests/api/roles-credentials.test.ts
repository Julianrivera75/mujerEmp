import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createClass } from '@/app/api/classes/route';
import { PUT as updateUser } from '@/app/api/admin/users/route';
import { POST as credentials } from '@/app/api/admin/users/credentials/route';
import { POST as switchRole } from '@/app/api/auth/switch-role/route';
import { setViewCookie } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const post = (handler: typeof credentials, path: string, body: Record<string, unknown>) =>
  handler(request(path, { method: 'POST', body }));

describe('POST /api/admin/users/credentials', () => {
  const run = (ids: string[]) => post(credentials, '/api/admin/users/credentials', { ids });

  it('solo la administradora restablece credenciales', async () => {
    for (const actor of [null, w.carolina, w.sofia]) {
      actAs(actor);
      expect((await run([w.sofia.id])).status).toBe(actor ? 403 : 401);
    }
  });

  it('una estudiante recibe su número de estudiante sin guiones y la contraseña queda cifrada', async () => {
    await prisma.user.update({
      where: { id: w.sofia.id },
      data: { studentNumber: 'CODEP 044-100526'.replace('CODEP ', '') },
    });
    actAs(w.admin);
    const res = await read(await run([w.sofia.id]));
    expect(res.status).toBe(200);
    expect(res.body.credentials).toHaveLength(1);
    expect(res.body.credentials[0]).toMatchObject({
      email: 'sofia@prueba.test',
      role: 'STUDENT',
      password: '044100526',
    });

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.passwordHash).not.toContain('044100526');
    expect(await bcrypt.compare('044100526', saved.passwordHash)).toBe(true);
    expect(saved.tokenVersion).toBe(1);
  });

  it('una persona sin número de estudiante recibe 9 dígitos al azar, distintos entre cuentas', async () => {
    await prisma.user.updateMany({ data: { studentNumber: null } });
    actAs(w.admin);
    const res = await read(await run([w.carolina.id, w.valeria.id]));
    const [a, b] = res.body.credentials.map((c: { password: string }) => c.password);
    expect(a).toMatch(/^\d{9}$/);
    expect(b).toMatch(/^\d{9}$/);
    expect(a).not.toBe(b);
  });

  it('no incluye administradoras, la cuenta propia, inactivas ni anonimizadas', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { status: 'INACTIVO' } });
    await prisma.user.update({ where: { id: w.valeria.id }, data: { anonymizedAt: new Date() } });
    actAs(w.admin);
    const res = await read(await run([w.admin.id, w.lucia.id, w.valeria.id, w.sofia.id]));
    expect(res.body.credentials.map((c: { id: string }) => c.id)).toEqual([w.sofia.id]);
    expect(res.body.skipped).toBe(3);
  });

  it('limita el tamaño del lote y exige al menos una cuenta', async () => {
    actAs(w.admin);
    expect((await run([])).status).toBe(400);
    expect((await run(Array.from({ length: 16 }, (_, i) => `id-${i}`))).status).toBe(400);
  });
});

describe('roles adicionales', () => {
  const update = (body: Record<string, unknown>) => updateUser(request('/api/admin/users', { method: 'PUT', body }));

  it('la administradora marca un segundo rol y se cierran las sesiones de esa cuenta', async () => {
    actAs(w.admin);
    const res = await read(await update({ id: w.carolina.id, extraRoles: ['STUDENT', 'MENTOR'] }));
    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.carolina.id } });
    // el rol principal no se repite entre los adicionales
    expect(saved.extraRoles).toEqual(['STUDENT']);
    expect(saved.tokenVersion).toBe(1);
  });

  it('una mentora que también es estudiante puede inscribirse en clases y una estudiante que es mentora dictarlas', async () => {
    await prisma.user.update({ where: { id: w.carolina.id }, data: { extraRoles: ['STUDENT'] } });
    await prisma.user.update({ where: { id: w.sofia.id }, data: { extraRoles: ['MENTOR'] } });
    actAs(w.admin);
    const start = new Date(2026, 9, 6, 15);
    const res = await read(
      await createClass(
        request('/api/classes', {
          method: 'POST',
          body: {
            title: 'Clase mixta',
            dateStart: start.toISOString(),
            dateEnd: new Date(start.getTime() + 7200000).toISOString(),
            mentorId: w.sofia.id,
            studentIds: [w.carolina.id, w.lucia.id],
          },
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body.classSession.enrollments.map((e: { student: { id: string } }) => e.student.id).sort()).toEqual(
      [w.carolina.id, w.lucia.id].sort(),
    );
  });

  it('un rol adicional inválido se rechaza', async () => {
    actAs(w.admin);
    expect((await update({ id: w.carolina.id, extraRoles: ['ROOT'] })).status).toBe(400);
  });
});

describe('POST /api/auth/switch-role', () => {
  const run = (role: string) => post(switchRole, '/api/auth/switch-role', { role });

  it('cambia a un rol que la cuenta tiene y devuelve el panel de destino', async () => {
    actAs({ ...w.carolina, roles: ['MENTOR', 'STUDENT'] });
    const res = await read(await run('STUDENT'));
    expect(res.status).toBe(200);
    expect(res.body.redirectUrl).toBe('/estudiante');
    expect(setViewCookie).toHaveBeenCalledWith('STUDENT');
  });

  it('rechaza un rol que la cuenta no tiene, un valor inválido y a una persona anónima', async () => {
    actAs(w.carolina);
    expect((await run('ADMIN')).status).toBe(403);
    expect((await run('ROOT')).status).toBe(400);
    actAs(null);
    expect((await run('STUDENT')).status).toBe(401);
  });
});
