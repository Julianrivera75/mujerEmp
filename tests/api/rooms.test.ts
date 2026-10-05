import { beforeEach, describe, expect, it } from 'vitest';
import { POST as leaveRoom } from '@/app/api/attendance/leave/route';
import { POST as markAttendance } from '@/app/api/attendance/mark/route';
import prisma from '@/lib/prisma';
import { settleCarryOver } from '@/lib/rooms-db';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;
let A: { id: string };
let B: { id: string };
let C: { id: string };

const LINK = 'https://meet.google.com/sala-compartida-1';
const MIN = 60 * 1000;
/** Instante base: media hora después del inicio de la clase A (que dura 60 min). */
let t0: Date;

async function makeClass(title: string, start: Date, end: Date, enrolled: string[]) {
  return prisma.classSession.create({
    data: {
      title,
      dateStart: start,
      dateEnd: end,
      monthKey: '2026-10',
      mentorId: w.carolina.id,
      meetLink: LINK,
      enrollments: { create: enrolled.map((studentId) => ({ studentId })) },
    },
  });
}

const attendanceOf = (classId: string, studentId: string) =>
  prisma.attendance.findUnique({ where: { classId_studentId: { classId, studentId } } });

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);

  // Tres clases seguidas con el mismo enlace; "ahora" cae dentro de la primera.
  const now = Date.now();
  const startA = new Date(now - 30 * MIN);
  A = await makeClass('Clase A', startA, new Date(startA.getTime() + 60 * MIN), [w.sofia.id, w.lucia.id]);
  B = await makeClass('Clase B', new Date(startA.getTime() + 60 * MIN), new Date(startA.getTime() + 120 * MIN), [
    w.sofia.id,
    w.lucia.id,
  ]);
  C = await makeClass('Clase C', new Date(startA.getTime() + 120 * MIN), new Date(startA.getTime() + 180 * MIN), [
    w.sofia.id,
  ]);
  t0 = new Date(now);
});

const mark = (classId: string) =>
  markAttendance(request('/api/attendance/mark', { method: 'POST', body: { classId } }));

describe('POST /api/attendance/mark en una sala compartida', () => {
  it('cuenta el clic a la clase en curso aunque se pulse el botón de otra', async () => {
    actAs(w.sofia);
    const res = await read(await mark(C.id));
    expect(res.status).toBe(200);
    expect(res.body.attendedClass.id).toBe(A.id);
    expect(await attendanceOf(A.id, w.sofia.id)).not.toBeNull();
    expect(await attendanceOf(C.id, w.sofia.id)).toBeNull();
    expect(res.body.continuesIn.map((c: { id: string }) => c.id)).toEqual([B.id, C.id]);
  });

  it('no cambia nada para una clase que no comparte sala', async () => {
    actAs(w.sofia);
    const res = await read(await mark(w.claseCarolina.id));
    expect(res.status).toBe(200);
    expect(res.body.attendedClass.id).toBe(w.claseCarolina.id);
    expect(res.body.continuesIn).toEqual([]);
  });
});

describe('settleCarryOver', () => {
  it('registra la asistencia de la clase siguiente cuando empieza, sin que la estudiante haga nada', async () => {
    actAs(w.sofia);
    await mark(A.id);

    // Todavía no empieza B.
    expect(await settleCarryOver(t0, { force: true })).toBe(0);

    const laterInB = new Date(t0.getTime() + 40 * MIN);
    expect(await settleCarryOver(laterInB, { force: true })).toBe(1);
    const carried = await attendanceOf(B.id, w.sofia.id);
    expect(carried?.source).toBe('CARRY');
    // Lucia no hizo clic en A: no se le arrastra nada.
    expect(await attendanceOf(B.id, w.lucia.id)).toBeNull();
  });

  it('propaga A → B → C y es idempotente', async () => {
    actAs(w.sofia);
    await mark(A.id);
    const inC = new Date(t0.getTime() + 100 * MIN);
    expect(await settleCarryOver(inC, { force: true })).toBe(2);
    expect(await settleCarryOver(inC, { force: true })).toBe(0);
    expect(await prisma.attendance.count({ where: { studentId: w.sofia.id } })).toBe(3);
  });

  it('no inscribe ni cuenta a quien no está inscrita en la clase siguiente', async () => {
    actAs(w.lucia);
    await mark(A.id);
    const inC = new Date(t0.getTime() + 100 * MIN);
    await settleCarryOver(inC, { force: true });
    expect(await attendanceOf(B.id, w.lucia.id)).not.toBeNull();
    // Lucia no está inscrita en C.
    expect(await attendanceOf(C.id, w.lucia.id)).toBeNull();
  });
});

describe('POST /api/attendance/leave', () => {
  it('detiene la permanencia y conserva la asistencia que ya tenía', async () => {
    actAs(w.sofia);
    await mark(A.id);
    const left = await read(
      await leaveRoom(request('/api/attendance/leave', { method: 'POST', body: { classId: A.id } })),
    );
    expect(left.status).toBe(200);
    expect(left.body.updated).toBe(1);

    const inC = new Date(t0.getTime() + 100 * MIN);
    expect(await settleCarryOver(inC, { force: true })).toBe(0);
    expect(await attendanceOf(A.id, w.sofia.id)).not.toBeNull();
    expect(await attendanceOf(B.id, w.sofia.id)).toBeNull();
  });

  it('volver a entrar la reactiva', async () => {
    actAs(w.sofia);
    await mark(A.id);
    await leaveRoom(request('/api/attendance/leave', { method: 'POST', body: { classId: A.id } }));
    await mark(A.id);
    expect((await attendanceOf(A.id, w.sofia.id))?.leftAt).toBeNull();

    const inB = new Date(t0.getTime() + 40 * MIN);
    expect(await settleCarryOver(inB, { force: true })).toBe(1);
  });

  it('solo la estudiante puede avisar su salida', async () => {
    actAs(w.carolina);
    expect(
      (await read(await leaveRoom(request('/api/attendance/leave', { method: 'POST', body: { classId: A.id } }))))
        .status,
    ).toBe(403);
  });
});
