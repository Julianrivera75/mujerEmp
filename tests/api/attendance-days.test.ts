import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getAttendances } from '@/app/api/admin/attendances/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

const LINK = 'https://meet.google.com/abc-defg-hij';
const HOUR = 60 * 60 * 1000;

/** Instante de hace `daysAgo` días a las 10:00 (hora de Colombia), más `hours` horas. */
const at = (daysAgo: number, hours = 0) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 15) + hours * HOUR);
};

async function makeClass(title: string, start: Date, mentorId: string, extra: Record<string, unknown> = {}) {
  return prisma.classSession.create({
    data: {
      title,
      dateStart: start,
      dateEnd: new Date(start.getTime() + HOUR),
      monthKey: '2026-10',
      mentorId,
      meetLink: LINK,
      enrollments: { create: [{ studentId: w.sofia.id }] },
      ...extra,
    },
  });
}

const enter = (classId: string, joinedAt: Date) =>
  prisma.attendance.create({ data: { classId, studentId: w.sofia.id, joinedAt } });

const list = async () => read(await getAttendances(request('/api/admin/attendances')));

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

describe('GET /api/admin/attendances: asistencia por día', () => {
  it('entrar a una charla del día basta, y varios ingresos el mismo día cuentan un solo día', async () => {
    const [a, b] = await Promise.all([
      makeClass('Charla 1', at(2), w.carolina.id),
      makeClass('Charla 2', at(2, 2), w.carolina.id),
      makeClass('Charla 3', at(2, 4), w.carolina.id),
    ]);
    await enter(a.id, at(2, 0.1));
    await enter(b.id, at(2, 2.1));

    actAs(w.admin);
    const res = await list();
    expect(res.status).toBe(200);
    const sofia = res.body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id);
    expect(sofia).toMatchObject({ totalDays: 1, attendedDays: 1, percentage: 100 });
    expect(res.body.days).toHaveLength(1);
    expect(res.body.days[0]).toMatchObject({ studentId: w.sofia.id, classesAttended: 2, classesInDay: 3 });
    // El detalle por charla se conserva.
    expect(res.body.attendances).toHaveLength(2);
  });

  it('el porcentaje se calcula sobre los días con charlas, no sobre las clases', async () => {
    const dayOne = [await makeClass('A1', at(3), w.carolina.id), await makeClass('A2', at(3, 2), w.carolina.id)];
    await makeClass('B1', at(2), w.carolina.id);
    await enter(dayOne[0].id, at(3, 0.1));

    actAs(w.admin);
    const sofia = (await list()).body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id);
    // 2 días con charlas y presente en 1: 50 % (por clases habría sido 1 de 3).
    expect(sofia).toMatchObject({ totalDays: 2, attendedDays: 1, percentage: 50 });
  });

  it('ignora las charlas canceladas y los días que todavía no llegan', async () => {
    const past = await makeClass('Pasada', at(2), w.carolina.id);
    await makeClass('Cancelada', at(1), w.carolina.id, { status: 'CANCELADA' });
    await enter(past.id, at(2, 0.1));

    actAs(w.admin);
    const sofia = (await list()).body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id);
    // La clase de mañana del mundo de pruebas y la cancelada no entran al denominador.
    expect(sofia).toMatchObject({ totalDays: 1, attendedDays: 1, percentage: 100 });
  });

  it('una mentora solo ve los días de sus propias clases', async () => {
    const mine = await makeClass('De Carolina', at(2), w.carolina.id);
    await makeClass('De Valeria', at(1), w.valeria.id);
    await enter(mine.id, at(2, 0.1));

    actAs(w.valeria);
    expect((await list()).body.days).toEqual([]);

    actAs(w.carolina);
    const res = await list();
    expect(res.body.days).toHaveLength(1);
    expect(res.body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id)).toMatchObject({
      totalDays: 1,
      attendedDays: 1,
    });
  });

  it('una estudiante no recibe el resumen de las demás', async () => {
    actAs(w.sofia);
    const res = await list();
    expect(res.body.days).toEqual([]);
    expect(res.body.studentSummary).toEqual([]);
  });
});
