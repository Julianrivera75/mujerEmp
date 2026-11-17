import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getCertificates } from '@/app/api/admin/certificates/route';
import { DELETE as deleteOverride, GET as getOverrides, POST as postOverride } from '@/app/api/admin/certificates/overrides/route';
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
  // Dentro de la ventana de descarga del Módulo 1 (últimos 5 días de octubre de 2026).
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });
});

describe('POST/DELETE/GET /api/admin/certificates/overrides', () => {
  it('solo la administración gestiona autorizaciones/bloqueos', async () => {
    actAs(w.sofia);
    expect((await getOverrides(request('/api/admin/certificates/overrides'))).status).toBe(403);
    expect(
      (
        await postOverride(
          request('/api/admin/certificates/overrides', {
            method: 'POST',
            body: { studentIds: [w.sofia.id], moduleNumber: 1, action: 'AUTHORIZED', reason: 'Motivo de prueba' },
          }),
        )
      ).status,
    ).toBe(403);
  });

  it('autorizar vuelve disponible el certificado aunque no haya asistido', async () => {
    actAs(w.admin);
    // Sofia no tiene ninguna charla asistida del Módulo 1: sin autorización, no es elegible.
    const before = await read(await getCertificates(request('/api/admin/certificates?moduleNumber=1')));
    expect(before.body.rows.find((r: { email: string }) => r.email === w.sofia.email)).toMatchObject({
      status: 'no-classes',
    });

    const post = await postOverride(
      request('/api/admin/certificates/overrides', {
        method: 'POST',
        body: { studentIds: [w.sofia.id], moduleNumber: 1, action: 'AUTHORIZED', reason: 'Acuerdo con coordinación' },
      }),
    );
    expect(post.status).toBe(200);

    const after = await read(await getCertificates(request('/api/admin/certificates?moduleNumber=1')));
    expect(after.body.rows.find((r: { email: string }) => r.email === w.sofia.email)).toMatchObject({
      status: 'available',
      override: expect.objectContaining({ action: 'AUTHORIZED', reason: 'Acuerdo con coordinación' }),
    });
  });

  it('bloquear impide el certificado aunque cumpla la regla', async () => {
    // Una charla asistida en octubre de 2026 (Módulo 1): basta para cumplir "al menos una asistencia".
    await prisma.classSession.create({
      data: {
        title: 'Charla 6',
        dateStart: new Date(2026, 9, 6, 15),
        dateEnd: new Date(2026, 9, 6, 17),
        monthKey: '2026-10',
        mentorId: w.carolina.id,
        meetLink: 'https://meet.google.com/abc-defg-hij',
        enrollments: { create: [{ studentId: w.sofia.id }] },
        attendances: { create: [{ studentId: w.sofia.id }] },
      },
    });
    actAs(w.admin);

    const post = await postOverride(
      request('/api/admin/certificates/overrides', {
        method: 'POST',
        body: { studentIds: [w.sofia.id], moduleNumber: 1, action: 'BLOCKED', reason: 'Pendiente de revisión' },
      }),
    );
    expect(post.status).toBe(200);

    const after = await read(await getCertificates(request('/api/admin/certificates?moduleNumber=1')));
    expect(after.body.rows.find((r: { email: string }) => r.email === w.sofia.email)).toMatchObject({
      status: 'blocked',
    });
  });

  it('revertir devuelve a la estudiante a la regla normal del módulo', async () => {
    actAs(w.admin);
    const post = await postOverride(
      request('/api/admin/certificates/overrides', {
        method: 'POST',
        body: { studentIds: [w.sofia.id], moduleNumber: 1, action: 'AUTHORIZED', reason: 'Acuerdo con coordinación' },
      }),
    );
    const postBody = await read(post);
    expect(postBody.body.success).toBe(true);

    const listBefore = await read(await getOverrides(request('/api/admin/certificates/overrides')));
    expect(listBefore.body.overrides).toHaveLength(1);
    const overrideId = listBefore.body.overrides[0].id;

    const del = await deleteOverride(
      request('/api/admin/certificates/overrides', { method: 'DELETE', body: { id: overrideId } }),
    );
    expect(del.status).toBe(200);

    const listAfter = await read(await getOverrides(request('/api/admin/certificates/overrides')));
    expect(listAfter.body.overrides).toHaveLength(0);

    const after = await read(await getCertificates(request('/api/admin/certificates?moduleNumber=1')));
    expect(after.body.rows.find((r: { email: string }) => r.email === w.sofia.email)).toMatchObject({
      status: 'no-classes',
      override: null,
    });
  });

  it('rechaza un motivo demasiado corto o un estudiante inexistente', async () => {
    actAs(w.admin);
    const shortReason = await postOverride(
      request('/api/admin/certificates/overrides', {
        method: 'POST',
        body: { studentIds: [w.sofia.id], moduleNumber: 1, action: 'AUTHORIZED', reason: 'ok' },
      }),
    );
    expect(shortReason.status).toBe(400);

    const badStudent = await postOverride(
      request('/api/admin/certificates/overrides', {
        method: 'POST',
        body: { studentIds: ['no-existe'], moduleNumber: 1, action: 'AUTHORIZED', reason: 'Motivo válido' },
      }),
    );
    expect(badStudent.status).toBe(400);
  });
});
