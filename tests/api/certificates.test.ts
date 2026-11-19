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
  // Las clases del mundo de pruebas son "de mañana": si "ahora" cae en octubre de 2026 chocan
  // con las clases de módulo fijas de este archivo (también monthKey 2026-10). Se eliminan porque
  // estas pruebas no las necesitan.
  await prisma.classSession.deleteMany({ where: { id: { in: [w.claseCarolina.id, w.claseValeria.id] } } });
  actAs(null);
});

const list = () => GET(request('/api/certificates'));

/** Clase de octubre de 2026 (del día indicado) a la que se inscribe Sofia; `attended` indica si registra asistencia. */
async function octoberClass(title: string, attended: boolean, day = 6) {
  const cls = await prisma.classSession.create({
    data: {
      title,
      dateStart: new Date(2026, 9, day, 15),
      dateEnd: new Date(2026, 9, day, 17),
      monthKey: '2026-10',
      mentorId: w.carolina.id,
      meetLink: 'https://meet.google.com/abc-defg-hij',
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

  it('no incluye porcentaje, días ni la regla: la estudiante no ve su propia asistencia', async () => {
    await octoberClass('Clase 1', true);
    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });
    const first = (await read(await list())).body.modules[0];
    expect(Object.keys(first).sort()).toEqual(['art', 'issuedOn', 'monthKey', 'number', 'opensAt', 'status', 'title']);
    expect(first.percentage).toBeUndefined();
    expect(first.attended).toBeUndefined();
    expect(first.total).toBeUndefined();
    expect(first.rule).toBeUndefined();
  });

  it('cuenta solo los días con charlas del módulo en los que la estudiante está inscrita (vía el estado resultante)', async () => {
    await octoberClass('Clase 1', true);
    await octoberClass('Clase 2', false, 7);
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
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });
    const res = await read(await list());
    // Módulo 1 tiene la excepción de "al menos un día": con 1 de 2 asistida, ya está disponible.
    expect(res.body.modules[0]).toMatchObject({ number: 1, status: 'available' });
    // Módulo 2 no tiene clases propias de la estudiante (la "Ajena" no cuenta: no está inscrita).
    expect(res.body.modules[1]).toMatchObject({ number: 2, status: 'no-classes' });
  });

  it('entrar a una sola charla del día basta: varias charlas el mismo día cuentan un solo día', async () => {
    await octoberClass('Charla 1', true);
    await octoberClass('Charla 2', false);
    await octoberClass('Charla 3', false);

    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });
    const first = (await read(await list())).body.modules[0];
    expect(first).toMatchObject({ number: 1, status: 'available' });
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

  it('el Módulo 1 es la excepción: basta un día de asistencia aunque el porcentaje sea bajo', async () => {
    await octoberClass('Clase 1', true, 1);
    await octoberClass('Clase 2', false, 8);
    await octoberClass('Clase 3', false, 15);
    await octoberClass('Clase 4', false, 22);

    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });
    const first = (await read(await list())).body.modules[0];
    expect(first).toMatchObject({ number: 1, status: 'available' });
  });
});
