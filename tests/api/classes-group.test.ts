import { beforeEach, describe, expect, it } from 'vitest';
import { POST, PUT } from '@/app/api/classes/group/route';
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

// 2026-12-01, para no chocar con las clases que ya siembra createWorld.
const day = (hour: number, minute = 0) => new Date(2026, 11, 1, hour, minute).toISOString();

const slot = (overrides: Record<string, unknown> = {}) => ({
  title: 'Charla',
  dateStart: day(9),
  dateEnd: day(10),
  mentorId: w.carolina.id,
  ...overrides,
});

const post = (body: Record<string, unknown>) => POST(request('/api/classes/group', { method: 'POST', body }));
const put = (body: Record<string, unknown>) => PUT(request('/api/classes/group', { method: 'PUT', body }));

describe('POST /api/classes/group', () => {
  it('crea 2 clases con un groupId compartido', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        meetLink: 'https://meet.google.com/abc-defg-hij',
        slots: [slot({ title: 'Charla 1' }), slot({ title: 'Charla 2', dateStart: day(10), dateEnd: day(11) })],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.groupId).toBeTruthy();
    expect(res.body.classSessions).toHaveLength(2);
    expect(res.body.classSessions.every((c: { groupId: string }) => c.groupId === res.body.groupId)).toBe(true);
  });

  it('crea 3 clases con un groupId compartido', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        slots: [
          slot({ title: 'Charla 1' }),
          slot({ title: 'Charla 2', dateStart: day(10), dateEnd: day(11) }),
          slot({ title: 'Charla 3', dateStart: day(11), dateEnd: day(12) }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.classSessions).toHaveLength(3);
    const groupIds = new Set(res.body.classSessions.map((c: { groupId: string }) => c.groupId));
    expect(groupIds.size).toBe(1);
  });

  it('rechaza una 4ta clase', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        slots: [
          slot({ dateStart: day(9), dateEnd: day(10) }),
          slot({ dateStart: day(10), dateEnd: day(11) }),
          slot({ dateStart: day(11), dateEnd: day(12) }),
          slot({ dateStart: day(12), dateEnd: day(13) }),
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rechaza clases de días distintos en la misma programación', async () => {
    actAs(w.admin);
    const otherDay = new Date(2026, 11, 2, 9).toISOString();
    const res = await read(
      await post({ slots: [slot({ dateStart: day(9), dateEnd: day(10) }), slot({ dateStart: otherDay, dateEnd: new Date(2026, 11, 2, 10).toISOString() })] }),
    );
    expect(res.status).toBe(400);
  });

  it('acepta a la misma mentora repetida sin aviso si no se cruza', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        slots: [
          slot({ mentorId: w.carolina.id, dateStart: day(9), dateEnd: day(10) }),
          slot({ mentorId: w.carolina.id, dateStart: day(10), dateEnd: day(11) }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.warnings).toEqual([]);
  });

  it('acepta (sin bloquear) a la misma mentora con horarios cruzados, con aviso', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        slots: [
          slot({ mentorId: w.carolina.id, dateStart: day(9), dateEnd: day(10) }),
          slot({ mentorId: w.carolina.id, dateStart: day(9, 30), dateEnd: day(10, 30) }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.warnings).toHaveLength(1);
    expect(res.body.warnings[0].mentorName).toBe('Carolina');
  });

  it('mentoras distintas que se cruzan no generan aviso', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        slots: [
          slot({ mentorId: w.carolina.id, dateStart: day(9), dateEnd: day(10) }),
          slot({ mentorId: w.valeria.id, dateStart: day(9, 30), dateEnd: day(10, 30) }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.warnings).toEqual([]);
  });

  it('una foto inválida en cualquier clase revierte toda la transacción', async () => {
    actAs(w.admin);
    const res = await read(
      await post({
        slots: [
          slot({ title: 'Buena', dateStart: day(9), dateEnd: day(10), imageKeys: [`clases/${w.admin.id}/ok.png`] }),
          slot({
            title: 'Mala',
            dateStart: day(10),
            dateEnd: day(11),
            imageKeys: [`clases/${w.lucia.id}/ajena.png`],
          }),
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.classSession.count({ where: { title: { in: ['Buena', 'Mala'] } } })).toBe(0);
  });
});

describe('PUT /api/classes/group', () => {
  async function createGroup() {
    actAs(w.admin);
    const res = await read(
      await post({
        meetLink: 'https://meet.google.com/abc-defg-hij',
        slots: [
          slot({ title: 'Charla 1', dateStart: day(9), dateEnd: day(10) }),
          slot({ title: 'Charla 2', dateStart: day(10), dateEnd: day(11) }),
        ],
      }),
    );
    return res.body as { groupId: string; classSessions: { id: string }[] };
  }

  it('agrega una clase a un grupo existente (de 2 pasa a 3)', async () => {
    const group = await createGroup();
    actAs(w.admin);
    const res = await read(
      await put({
        groupId: group.groupId,
        meetLink: 'https://meet.google.com/abc-defg-hij',
        slots: [
          { id: group.classSessions[0].id, ...slot({ title: 'Charla 1', dateStart: day(9), dateEnd: day(10) }) },
          { id: group.classSessions[1].id, ...slot({ title: 'Charla 2', dateStart: day(10), dateEnd: day(11) }) },
          slot({ title: 'Charla 3', dateStart: day(11), dateEnd: day(12) }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.classSessions).toHaveLength(3);
    expect(new Set(res.body.classSessions.map((c: { groupId: string }) => c.groupId))).toEqual(new Set([group.groupId]));
  });

  it('quita una clase de un grupo de 3 (pasa a 2, mismo groupId)', async () => {
    actAs(w.admin);
    const created = await read(
      await post({
        slots: [
          slot({ title: 'Charla 1', dateStart: day(9), dateEnd: day(10) }),
          slot({ title: 'Charla 2', dateStart: day(10), dateEnd: day(11) }),
          slot({ title: 'Charla 3', dateStart: day(11), dateEnd: day(12) }),
        ],
      }),
    );
    const [a, b, c] = created.body.classSessions;

    const res = await read(
      await put({
        groupId: created.body.groupId,
        slots: [
          { id: a.id, ...slot({ title: 'Charla 1', dateStart: day(9), dateEnd: day(10) }) },
          { id: b.id, ...slot({ title: 'Charla 2', dateStart: day(10), dateEnd: day(11) }) },
        ],
        removedIds: [c.id],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.classSessions).toHaveLength(2);
    expect(await prisma.classSession.count({ where: { id: c.id } })).toBe(0);
  });

  it('al reducir un grupo a 1 clase, le limpia el groupId', async () => {
    const group = await createGroup();
    actAs(w.admin);
    const [a, b] = group.classSessions;
    const res = await read(
      await put({
        groupId: group.groupId,
        slots: [{ id: a.id, ...slot({ title: 'Charla 1', dateStart: day(9), dateEnd: day(10) }) }],
        removedIds: [b.id],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.groupId).toBeNull();
    const remaining = await prisma.classSession.findUniqueOrThrow({ where: { id: a.id } });
    expect(remaining.groupId).toBeNull();
    expect(await prisma.classSession.count({ where: { id: b.id } })).toBe(0);
  });

  it('solo la administración gestiona programaciones', async () => {
    const group = await createGroup();
    for (const actor of [null, w.sofia, w.carolina]) {
      actAs(actor);
      const res = await read(
        await put({
          groupId: group.groupId,
          slots: group.classSessions.map((c, i) => ({ id: c.id, ...slot({ dateStart: day(9 + i), dateEnd: day(10 + i) }) })),
        }),
      );
      expect([401, 403]).toContain(res.status);
    }
  });
});
