import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/certificates/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  vi.useRealTimers();
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const list = () => GET(request('/api/certificates'));

/** Clase de octubre de 2026 a la que se inscribe Sofia; `attended` indica si registra asistencia. */
async function octoberClass(title: string, attended: boolean) {
  const cls = await prisma.classSession.create({
    data: {
      title,
      dateStart: new Date(2026, 9, 6, 15),
      dateEnd: new Date(2026, 9, 6, 17),
      monthKey: '2026-10',
      mentorId: w.carolina.id,
      enrollments: { create: [{ studentId: w.sofia.id }] },
      ...(attended ? { attendances: { create: [{ studentId: w.sofia.id }] } } : {}),
    },
  });
  return cls;
}

describe('GET /api/certificates', () => {
  it('solo las estudiantes consultan sus certificados', async () => {
    for (const actor of [null, w.carolina, w.admin]) {
      actAs(actor);
      expect((await list()).status).toBe(actor ? 403 : 401);
    }
  });

  it('devuelve los cinco módulos con su nombre y número de estudiante', async () => {
    actAs(w.sofia);
    const res = await read(await list());
    expect(res.status).toBe(200);
    expect(res.body.student).toEqual({ name: 'Sofia', studentNumber: 'DOC-Sofia' });
    expect(res.body.modules.map((m: { number: number }) => m.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('cuenta solo las clases del módulo en las que la estudiante está inscrita', async () => {
    await octoberClass('Clase 1', true);
    await octoberClass('Clase 2', false);
    await prisma.classSession.create({
      data: {
        title: 'Ajena',
        dateStart: new Date(2026, 9, 7, 15),
        dateEnd: new Date(2026, 9, 7, 17),
        monthKey: '2026-10',
        mentorId: w.carolina.id,
      },
    });

    actAs(w.sofia);
    const res = await read(await list());
    const first = res.body.modules[0];
    expect(first).toMatchObject({ number: 1, total: 2, attended: 1, percentage: 50 });
    expect(res.body.modules[1]).toMatchObject({ number: 2, total: 0, attended: 0 });
  });

  it('el estado depende de la fecha: bloqueado antes de la ventana y disponible después con 80 %', async () => {
    await octoberClass('Clase 1', true);

    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 20) });
    expect((await read(await list())).body.modules[0].status).toBe('locked');

    vi.setSystemTime(new Date(2026, 9, 29));
    expect((await read(await list())).body.modules[0].status).toBe('available');
  });

  it('una estudiante sin asistencia en el módulo no lo obtiene', async () => {
    await octoberClass('Clase 1', false);
    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 2) });
    expect((await read(await list())).body.modules[0].status).toBe('low-attendance');
  });
});
