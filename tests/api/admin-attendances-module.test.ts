import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getAttendances } from '@/app/api/admin/attendances/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  vi.useRealTimers();
  await resetDb();
  w = await createWorld();
  // createWorld() crea una clase de cada mentora con fecha relativa a "hoy"; no nos sirven para fechas fijas.
  await prisma.classSession.deleteMany({ where: { id: { in: [w.claseCarolina.id, w.claseValeria.id] } } });
  actAs(null);
  // Dentro de la ventana del Módulo 1 (octubre de 2026) y del Módulo 2 (noviembre de 2026).
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 29) });
});

async function classOn(date: Date, monthKey: string, attended: boolean) {
  return prisma.classSession.create({
    data: {
      title: `Charla ${date.toISOString()}`,
      dateStart: date,
      dateEnd: new Date(date.getTime() + 2 * 3600 * 1000),
      monthKey,
      mentorId: w.carolina.id,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      enrollments: { create: [{ studentId: w.sofia.id }] },
      ...(attended ? { attendances: { create: [{ studentId: w.sofia.id }] } } : {}),
    },
  });
}

describe('GET /api/admin/attendances: filtro por módulo y datos limpios', () => {
  it('sin moduleNumber da el acumulado global; con moduleNumber da solo ese mes, igual que certificados', async () => {
    await classOn(new Date(2026, 9, 6, 15), '2026-10', true); // Módulo 1: 1 de 1 (100%)
    await classOn(new Date(2026, 10, 3, 15), '2026-11', true); // Módulo 2: asistida
    await classOn(new Date(2026, 10, 10, 15), '2026-11', false); // Módulo 2: no asistida

    actAs(w.admin);

    const all = await read(await getAttendances(request('/api/admin/attendances')));
    expect(all.body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id)).toMatchObject({
      totalDays: 3,
      attendedDays: 2,
    });
    expect(all.body.module).toBeNull();

    const mod1 = await read(await getAttendances(request('/api/admin/attendances?moduleNumber=1')));
    expect(mod1.body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id)).toMatchObject({
      totalDays: 1,
      attendedDays: 1,
      percentage: 100,
    });
    expect(mod1.body.module).toMatchObject({ number: 1, monthKey: '2026-10', totalDays: 1 });
    // El historial de días también queda filtrado al módulo.
    expect(mod1.body.days.every((d: { day: string }) => d.day.startsWith('2026-10'))).toBe(true);

    const mod2 = await read(await getAttendances(request('/api/admin/attendances?moduleNumber=2')));
    expect(mod2.body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id)).toMatchObject({
      totalDays: 2,
      attendedDays: 1,
      percentage: 50,
    });
  });

  it('excluye por defecto las cuentas @empoderas.org y las incluye con includeTest=true', async () => {
    await prisma.user.create({
      data: { name: 'Cuenta Prueba', email: 'prueba@empoderas.org', role: 'STUDENT', passwordHash: 'x' },
    });
    actAs(w.admin);

    const withoutTest = await read(await getAttendances(request('/api/admin/attendances')));
    expect(withoutTest.body.studentSummary.some((s: { email: string }) => s.email === 'prueba@empoderas.org')).toBe(
      false,
    );

    const withTest = await read(await getAttendances(request('/api/admin/attendances?includeTest=true')));
    expect(withTest.body.studentSummary.some((s: { email: string }) => s.email === 'prueba@empoderas.org')).toBe(
      true,
    );
  });

  it('separa a las estudiantes inactivas del acumulado activo', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { status: 'INACTIVO' } });
    actAs(w.admin);

    const res = await read(await getAttendances(request('/api/admin/attendances')));
    expect(res.body.studentSummary.some((s: { id: string }) => s.id === w.lucia.id)).toBe(false);
    expect(res.body.inactiveStudentSummary.some((s: { id: string }) => s.id === w.lucia.id)).toBe(true);
  });

  it('sin clases en el módulo, el total de días es 0 (para que el cliente muestre "sin días")', async () => {
    actAs(w.admin);
    const res = await read(await getAttendances(request('/api/admin/attendances?moduleNumber=3')));
    expect(res.body.studentSummary.find((s: { id: string }) => s.id === w.sofia.id)).toMatchObject({
      totalDays: 0,
      attendedDays: 0,
      percentage: 0,
    });
    expect(res.body.module).toMatchObject({ number: 3, totalDays: 0, firstDay: null, lastDay: null });
  });
});
