import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/certificates/pdf/route';
import prisma from '@/lib/prisma';
import { request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  vi.useRealTimers();
  await resetDb();
  w = await createWorld();
  await prisma.classSession.deleteMany({ where: { id: { in: [w.claseCarolina.id, w.claseValeria.id] } } });
  actAs(null);
});

const pdf = (moduleNumber: number) => GET(request(`/api/certificates/pdf?moduleNumber=${moduleNumber}`));

async function octoberClass(title: string, attended: boolean, day = 6) {
  return prisma.classSession.create({
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
}

describe('GET /api/certificates/pdf', () => {
  it('exige sesión', async () => {
    actAs(null);
    expect((await pdf(1)).status).toBe(401);
  });

  it('solo las estudiantes descargan certificados', async () => {
    for (const actor of [w.carolina, w.admin]) {
      actAs(actor);
      expect((await pdf(1)).status).toBe(403);
    }
  });

  it('rechaza un número de módulo inválido', async () => {
    actAs(w.sofia);
    expect((await pdf(9)).status).toBe(400);
  });

  it('no entrega el PDF si la estudiante todavía no es elegible', async () => {
    await octoberClass('Clase 1', false);
    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });
    expect((await pdf(1)).status).toBe(403);
  });

  it('entrega el PDF cuando es elegible, con el mismo código en cada descarga', async () => {
    await octoberClass('Clase 1', true);
    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    const first = await pdf(1);
    expect(first.status).toBe(200);
    expect(first.headers.get('Content-Type')).toBe('application/pdf');
    const firstBytes = new Uint8Array(await first.arrayBuffer());
    expect(firstBytes.length).toBeGreaterThan(1000);

    const second = await pdf(1);
    expect(second.status).toBe(200);

    const issuances = await prisma.certificateIssuance.findMany({ where: { studentId: w.sofia.id } });
    expect(issuances).toHaveLength(1);
    expect(issuances[0].moduleNumber).toBe(1);
    expect(issuances[0].downloadCount).toBe(2);
  });
});
