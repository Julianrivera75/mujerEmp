import { beforeEach, describe, expect, it } from 'vitest';
import { POST as markAttendance } from '@/app/api/attendance/mark/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;
let A: { id: string };
let C: { id: string };

const LINK = 'https://meet.google.com/sala-compartida-1';
const MIN = 60 * 1000;

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
  await makeClass('Clase B', new Date(startA.getTime() + 60 * MIN), new Date(startA.getTime() + 120 * MIN), [
    w.sofia.id,
    w.lucia.id,
  ]);
  C = await makeClass('Clase C', new Date(startA.getTime() + 120 * MIN), new Date(startA.getTime() + 180 * MIN), [
    w.sofia.id,
  ]);
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
  });

  it('no cambia nada para una clase que no comparte sala', async () => {
    actAs(w.sofia);
    const res = await read(await mark(w.claseCarolina.id));
    expect(res.status).toBe(200);
    expect(res.body.attendedClass.id).toBe(w.claseCarolina.id);
  });
});
