import { beforeEach, describe, expect, it } from 'vitest';
import { POST as postUser, PUT as putUser } from '@/app/api/admin/users/route';
import { POST as toggleStatus } from '@/app/api/admin/users/toggle-status/route';
import { enrollInUpcomingClasses } from '@/lib/enrollment';
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

const post = (handler: (req: Request) => Promise<Response>, path: string, body: Record<string, unknown>) =>
  handler(request(path, { method: 'POST', body }));
const put = (handler: (req: Request) => Promise<Response>, path: string, body: Record<string, unknown>) =>
  handler(request(path, { method: 'PUT', body }));

describe('enrollInUpcomingClasses', () => {
  it('inscribe en las clases vigentes y no duplica si ya estaba inscrita', async () => {
    const count = await enrollInUpcomingClasses(w.lucia.id);
    expect(count).toBe(2); // la clase de Carolina y la de Valeria, ambas futuras en el mundo de pruebas
    expect(await prisma.classEnrollment.count({ where: { studentId: w.lucia.id } })).toBe(2);

    const again = await enrollInUpcomingClasses(w.lucia.id);
    expect(again).toBe(0);
    expect(await prisma.classEnrollment.count({ where: { studentId: w.lucia.id } })).toBe(2);
  });

  it('no inscribe en una clase cancelada ni en una que ya terminó', async () => {
    await prisma.classSession.update({ where: { id: w.claseCarolina.id }, data: { status: 'CANCELADA' } });
    await prisma.classSession.update({
      where: { id: w.claseValeria.id },
      data: { dateStart: new Date(Date.now() - 2 * 86400000), dateEnd: new Date(Date.now() - 86400000) },
    });
    const count = await enrollInUpcomingClasses(w.lucia.id);
    expect(count).toBe(0);
    expect(await prisma.classEnrollment.count({ where: { studentId: w.lucia.id } })).toBe(0);
  });
});

describe('inscripción automática al crear o editar un usuario', () => {
  it('una estudiante nueva queda inscrita en las clases vigentes', async () => {
    actAs(w.admin);
    const res = await read(
      await post(postUser, '/api/admin/users', {
        name: 'Nueva Estudiante',
        email: 'nueva.estudiante@prueba.test',
        password: 'clave-larga-123',
        role: 'STUDENT',
      }),
    );
    expect(res.status).toBe(200);
    const enrollments = await prisma.classEnrollment.count({ where: { studentId: res.body.user.id } });
    expect(enrollments).toBe(2); // clase de Carolina y de Valeria del mundo de pruebas
  });

  it('una mentora nueva no se inscribe en ninguna clase', async () => {
    actAs(w.admin);
    const res = await read(
      await post(postUser, '/api/admin/users', {
        name: 'Nueva Mentora',
        email: 'nueva.mentora@prueba.test',
        password: 'clave-larga-123',
        role: 'MENTOR',
      }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.classEnrollment.count({ where: { studentId: res.body.user.id } })).toBe(0);
  });

  it('una mentora a la que se le agrega el rol de estudiante queda inscrita en ese momento', async () => {
    actAs(w.admin);
    expect(await prisma.classEnrollment.count({ where: { studentId: w.carolina.id } })).toBe(0);
    const res = await read(await put(putUser, '/api/admin/users', { id: w.carolina.id, extraRoles: ['STUDENT'] }));
    expect(res.status).toBe(200);
    expect(await prisma.classEnrollment.count({ where: { studentId: w.carolina.id } })).toBe(2);
  });

  it('editar otros datos de una estudiante que ya era estudiante no vuelve a inscribirla ni la duplica', async () => {
    actAs(w.admin);
    await enrollInUpcomingClasses(w.sofia.id);
    const before = await prisma.classEnrollment.count({ where: { studentId: w.sofia.id } });
    const res = await read(await put(putUser, '/api/admin/users', { id: w.sofia.id, phone: '+1 305 555 0000' }));
    expect(res.status).toBe(200);
    expect(await prisma.classEnrollment.count({ where: { studentId: w.sofia.id } })).toBe(before);
  });
});

describe('reactivar una cuenta', () => {
  const toggle = (id: string, status: 'ACTIVO' | 'INACTIVO') =>
    post(toggleStatus, '/api/admin/users/toggle-status', { id, status });
  const enrolled = (userId: string) => prisma.classEnrollment.count({ where: { studentId: userId } });

  it('una estudiante reactivada recupera las clases vigentes, sin duplicar', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { status: 'INACTIVO' } });
    actAs(w.admin);

    expect((await toggle(w.lucia.id, 'ACTIVO')).status).toBe(200);
    expect(await enrolled(w.lucia.id)).toBe(2);

    expect((await toggle(w.lucia.id, 'ACTIVO')).status).toBe(200);
    expect(await enrolled(w.lucia.id)).toBe(2);
  });

  it('una cuenta de mentora y estudiante reactivada también se inscribe', async () => {
    await prisma.user.update({
      where: { id: w.lucia.id },
      data: { role: 'MENTOR', extraRoles: ['STUDENT'], status: 'INACTIVO' },
    });
    actAs(w.admin);

    await toggle(w.lucia.id, 'ACTIVO');
    expect(await enrolled(w.lucia.id)).toBe(2);
  });

  it('una mentora sin rol de estudiante no se inscribe, y desactivar tampoco inscribe', async () => {
    await prisma.user.update({ where: { id: w.valeria.id }, data: { status: 'INACTIVO' } });
    actAs(w.admin);

    await toggle(w.valeria.id, 'ACTIVO');
    expect(await enrolled(w.valeria.id)).toBe(0);

    await toggle(w.lucia.id, 'INACTIVO');
    expect(await enrolled(w.lucia.id)).toBe(0);
  });
});
