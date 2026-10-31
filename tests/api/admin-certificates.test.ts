import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getCertificates } from '@/app/api/admin/certificates/route';
import { GET as getPdf } from '@/app/api/admin/certificates/pdf/route';
import { GET as getRules, PUT as putRules } from '@/app/api/admin/certificates/rules/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
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

async function octoberClass(studentId: string, attended: boolean, day = 6) {
  return prisma.classSession.create({
    data: {
      title: `Charla ${day}`,
      dateStart: new Date(2026, 9, day, 15),
      dateEnd: new Date(2026, 9, day, 17),
      monthKey: '2026-10',
      mentorId: w.carolina.id,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      enrollments: { create: [{ studentId }] },
      ...(attended ? { attendances: { create: [{ studentId }] } } : {}),
    },
  });
}

describe('GET /api/admin/certificates', () => {
  it('solo la administración consulta la elegibilidad de todas', async () => {
    for (const actor of [null, w.carolina, w.sofia]) {
      actAs(actor);
      expect((await getCertificates(request('/api/admin/certificates'))).status).toBe(actor ? 403 : 401);
    }
  });

  it('excluye por defecto las cuentas @empoderas.org y las incluye con includeTest=true', async () => {
    await prisma.user.create({
      data: { name: 'Cuenta Prueba', email: 'prueba@empoderas.org', role: 'STUDENT', passwordHash: 'x' },
    });

    actAs(w.admin);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    const withoutTest = await read(await getCertificates(request('/api/admin/certificates')));
    expect(withoutTest.body.rows.some((r: { email: string }) => r.email === 'prueba@empoderas.org')).toBe(false);

    const withTest = await read(await getCertificates(request('/api/admin/certificates?includeTest=true')));
    expect(withTest.body.rows.some((r: { email: string }) => r.email === 'prueba@empoderas.org')).toBe(true);
  });

  it('filtra por módulo y por estado', async () => {
    await octoberClass(w.sofia.id, true, 1);
    actAs(w.admin);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    const res = await read(await getCertificates(request('/api/admin/certificates?moduleNumber=1&status=available')));
    const sofiaRows = res.body.rows.filter((r: { email: string }) => r.email === w.sofia.email);
    expect(sofiaRows).toEqual([
      expect.objectContaining({ moduleNumber: 1, status: 'available', ruleType: 'MIN_ATTENDED_DAYS', threshold: 1 }),
    ]);
  });
});

describe('GET/PUT /api/admin/certificates/rules', () => {
  it('solo la administración gestiona las reglas', async () => {
    actAs(w.sofia);
    expect((await getRules(request('/api/admin/certificates/rules'))).status).toBe(403);
    expect(
      (
        await putRules(
          request('/api/admin/certificates/rules', { method: 'PUT', body: { moduleNumber: 2, ruleType: 'MIN_ATTENDANCE_PERCENT', threshold: 50 } }),
        )
      ).status,
    ).toBe(403);
  });

  it('lista las cinco reglas sembradas, con la excepción del Módulo 1', async () => {
    actAs(w.admin);
    const res = await read(await getRules(request('/api/admin/certificates/rules')));
    expect(res.body.rules).toHaveLength(5);
    expect(res.body.rules[0]).toMatchObject({ moduleNumber: 1, ruleType: 'MIN_ATTENDED_DAYS', threshold: 1 });
    expect(res.body.rules[1]).toMatchObject({ moduleNumber: 2, ruleType: 'MIN_ATTENDANCE_PERCENT', threshold: 80 });
  });

  it('cambiar el umbral se refleja de inmediato en la elegibilidad', async () => {
    // Módulo 2 = noviembre de 2026: una charla asistida y una sin asistir (50 %).
    for (const [day, attended] of [[3, true], [10, false]] as const) {
      await prisma.classSession.create({
        data: {
          title: `Charla módulo 2 (${day})`,
          dateStart: new Date(2026, 10, day, 15),
          dateEnd: new Date(2026, 10, day, 17),
          monthKey: '2026-11',
          mentorId: w.carolina.id,
          meetLink: 'https://meet.google.com/abc-defg-hij',
          enrollments: { create: [{ studentId: w.sofia.id }] },
          ...(attended ? { attendances: { create: [{ studentId: w.sofia.id }] } } : {}),
        },
      });
    }

    actAs(w.admin);
    // Dentro de la ventana de descarga del Módulo 2 (últimos 5 días de noviembre).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 28) });

    const before = await read(
      await getCertificates(request('/api/admin/certificates?moduleNumber=2&status=available')),
    );
    expect(before.body.rows.some((r: { email: string }) => r.email === w.sofia.email)).toBe(false);

    const put = await putRules(
      request('/api/admin/certificates/rules', {
        method: 'PUT',
        body: { moduleNumber: 2, ruleType: 'MIN_ATTENDANCE_PERCENT', threshold: 50 },
      }),
    );
    expect(put.status).toBe(200);

    const after = await read(
      await getCertificates(request('/api/admin/certificates?moduleNumber=2&status=available')),
    );
    expect(after.body.rows.some((r: { email: string }) => r.email === w.sofia.email)).toBe(true);
  });
});

describe('GET /api/admin/certificates/pdf', () => {
  it('solo la administración descarga certificados ajenos', async () => {
    actAs(w.sofia);
    expect((await getPdf(request(`/api/admin/certificates/pdf?studentId=${w.sofia.id}&moduleNumber=1`))).status).toBe(
      403,
    );
  });

  it('exige el identificador de la estudiante', async () => {
    actAs(w.admin);
    expect((await getPdf(request('/api/admin/certificates/pdf?moduleNumber=1'))).status).toBe(400);
  });

  it('no entrega el PDF si la estudiante no es elegible', async () => {
    actAs(w.admin);
    expect(
      (await getPdf(request(`/api/admin/certificates/pdf?studentId=${w.sofia.id}&moduleNumber=1`))).status,
    ).toBe(403);
  });

  it('entrega el PDF de cualquier estudiante elegible', async () => {
    await octoberClass(w.sofia.id, true, 1);
    actAs(w.admin);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    const res = await getPdf(request(`/api/admin/certificates/pdf?studentId=${w.sofia.id}&moduleNumber=1`));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });
});
