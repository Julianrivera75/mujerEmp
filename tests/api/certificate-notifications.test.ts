import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as activity } from '@/app/api/activity/route';
import { POST as markAttendance } from '@/app/api/attendance/mark/route';
import { POST as notifyAll } from '@/app/api/admin/certificates/notify/route';
import prisma from '@/lib/prisma';
import { resetCertificateSyncThrottle, syncCertificatesAvailable } from '@/lib/notifications';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  vi.useRealTimers();
  await resetDb();
  resetCertificateSyncThrottle();
  w = await createWorld();
  await prisma.classSession.deleteMany({ where: { id: { in: [w.claseCarolina.id, w.claseValeria.id] } } });
  actAs(null);
});

async function octoberClassWithAttendance(studentId: string, day = 1) {
  return prisma.classSession.create({
    data: {
      title: `Charla ${day}`,
      dateStart: new Date(2026, 9, day, 15),
      dateEnd: new Date(2026, 9, day, 17),
      monthKey: '2026-10',
      mentorId: w.carolina.id,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      enrollments: { create: [{ studentId }] },
      attendances: { create: [{ studentId }] },
    },
  });
}

describe('syncCertificatesAvailable', () => {
  it('avisa una sola vez por módulo aunque se llame varias veces (dedupe)', async () => {
    await octoberClassWithAttendance(w.sofia.id);
    const now = new Date(2026, 9, 29);

    await syncCertificatesAvailable(w.sofia.id, now, true);
    await syncCertificatesAvailable(w.sofia.id, now, true);

    const notifications = await prisma.notification.findMany({
      where: { userId: w.sofia.id, type: 'CERTIFICATE_AVAILABLE' },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ dedupeKey: 'cert:1', href: '/estudiante/certificado' });
  });

  it('no avisa si ningún módulo está disponible', async () => {
    await syncCertificatesAvailable(w.sofia.id, new Date(2026, 9, 20), true);
    const notifications = await prisma.notification.count({
      where: { userId: w.sofia.id, type: 'CERTIFICATE_AVAILABLE' },
    });
    expect(notifications).toBe(0);
  });
});

describe('el heartbeat de actividad dispara el aviso', () => {
  it('POST /api/activity notifica a una estudiante con un certificado disponible', async () => {
    await octoberClassWithAttendance(w.sofia.id);
    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    await activity(request('/api/activity', { method: 'POST' }));

    const notifications = await prisma.notification.count({
      where: { userId: w.sofia.id, type: 'CERTIFICATE_AVAILABLE' },
    });
    expect(notifications).toBe(1);
  });
});

describe('marcar asistencia dispara el aviso de inmediato, sin esperar el throttle', () => {
  it('POST /api/attendance/mark notifica si esa asistencia vuelve elegible al módulo', async () => {
    const cls = await prisma.classSession.create({
      data: {
        title: 'Única charla',
        dateStart: new Date(2026, 9, 1, 15),
        dateEnd: new Date(2026, 9, 1, 17),
        monthKey: '2026-10',
        mentorId: w.carolina.id,
        meetLink: 'https://meet.google.com/abc-defg-hij',
        enrollments: { create: [{ studentId: w.sofia.id }] },
      },
    });

    actAs(w.sofia);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    const res = await markAttendance(request('/api/attendance/mark', { method: 'POST', body: { classId: cls.id } }));
    expect(res.status).toBe(200);

    const notifications = await prisma.notification.count({
      where: { userId: w.sofia.id, type: 'CERTIFICATE_AVAILABLE' },
    });
    expect(notifications).toBe(1);
  });
});

describe('POST /api/admin/certificates/notify', () => {
  it('solo la administración puede forzar el barrido', async () => {
    actAs(w.sofia);
    expect((await notifyAll(request('/api/admin/certificates/notify', { method: 'POST' }))).status).toBe(403);
  });

  it('notifica a todas las estudiantes elegibles de una vez', async () => {
    await octoberClassWithAttendance(w.sofia.id);
    actAs(w.admin);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 29) });

    const res = await read(await notifyAll(request('/api/admin/certificates/notify', { method: 'POST' })));
    expect(res.status).toBe(200);
    expect(res.body.notified).toBeGreaterThanOrEqual(2); // Sofia y Lucia, al menos

    const sofiaNotified = await prisma.notification.count({
      where: { userId: w.sofia.id, type: 'CERTIFICATE_AVAILABLE' },
    });
    expect(sofiaNotified).toBe(1);
  });
});
