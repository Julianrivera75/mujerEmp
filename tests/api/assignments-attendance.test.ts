import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getAssignments, POST as postAssignment } from '@/app/api/assignments/route';
import { POST as markAttendance } from '@/app/api/attendance/mark/route';
import { GET as getAttendances } from '@/app/api/admin/attendances/route';
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

describe('GET /api/assignments', () => {
  it('rechaza a una persona anónima', async () => {
    expect((await read(await getAssignments(request('/api/assignments')))).status).toBe(401);
  });

  it('cada rol ve solo las tareas de sus clases', async () => {
    const titles = async (actor: Parameters<typeof actAs>[0]) => {
      actAs(actor);
      const res = await read(await getAssignments(request('/api/assignments')));
      return res.body.assignments.map((a: { title: string }) => a.title);
    };

    expect(await titles(w.sofia)).toEqual(['Ensayo']);
    expect(await titles(w.lucia)).toEqual([]);
    expect(await titles(w.carolina)).toEqual(['Ensayo']);
    expect(await titles(w.valeria)).toEqual([]);
    expect(await titles(w.admin)).toEqual(['Ensayo']);
  });

  it('una estudiante no ve las entregas de otras estudiantes', async () => {
    await prisma.classEnrollment.create({ data: { classId: w.claseCarolina.id, studentId: w.lucia.id } });
    await prisma.submission.create({
      data: { assignmentId: w.tarea.id, studentId: w.lucia.id, notes: 'Entrega de Lucia', fileType: 'LINK' },
    });

    actAs(w.sofia);
    const res = await read(await getAssignments(request('/api/assignments')));
    const submissions = res.body.assignments[0].submissions;
    expect(submissions).toHaveLength(1);
    expect(res.raw).not.toContain('Entrega de Lucia');
  });
});

describe('POST /api/assignments', () => {
  const body = () => ({
    classId: w.claseCarolina.id,
    title: 'Nueva tarea',
    description: 'Instrucciones',
    dueDate: '2026-12-01T10:00',
  });

  it('una mentora no puede crear tareas en la clase de otra', async () => {
    actAs(w.valeria);
    const res = await read(await postAssignment(request('/api/assignments', { method: 'POST', body: body() })));
    expect(res.status).toBe(403);
  });

  it('las estudiantes y las personas anónimas no pueden crear tareas', async () => {
    for (const actor of [null, w.sofia]) {
      actAs(actor);
      const res = await read(await postAssignment(request('/api/assignments', { method: 'POST', body: body() })));
      expect([401, 403]).toContain(res.status);
    }
  });

  it('valida los campos obligatorios y la fecha', async () => {
    actAs(w.carolina);
    for (const bad of [
      { ...body(), title: '' },
      { ...body(), dueDate: 'no es fecha' },
      { ...body(), classId: 5 },
    ]) {
      const res = await read(await postAssignment(request('/api/assignments', { method: 'POST', body: bad })));
      expect(res.status).toBe(400);
    }
    const missing = await read(
      await postAssignment(request('/api/assignments', { method: 'POST', body: { ...body(), classId: 'no-existe' } })),
    );
    expect(missing.status).toBe(404);
  });

  it('la mentora de la clase crea la tarea', async () => {
    actAs(w.carolina);
    const res = await read(await postAssignment(request('/api/assignments', { method: 'POST', body: body() })));
    expect(res.status).toBe(200);
    expect(await prisma.assignment.count({ where: { classId: w.claseCarolina.id } })).toBe(2);
  });
});

describe('POST /api/attendance/mark', () => {
  const mark = (classId: string) =>
    markAttendance(request('/api/attendance/mark', { method: 'POST', body: { classId } }));

  it('rechaza a una persona anónima y valida el cuerpo', async () => {
    expect((await read(await mark(w.claseCarolina.id))).status).toBe(401);
    actAs(w.sofia);
    expect(
      (await read(await markAttendance(request('/api/attendance/mark', { method: 'POST', body: {} })))).status,
    ).toBe(400);
    expect((await read(await mark('no-existe'))).status).toBe(404);
  });

  it('una estudiante no inscrita no puede marcar asistencia', async () => {
    actAs(w.lucia);
    const res = await read(await mark(w.claseCarolina.id));
    expect(res.status).toBe(403);
    expect(res.raw).not.toContain('meet.google.com');
    expect(await prisma.attendance.count()).toBe(0);
  });

  it('una estudiante inscrita marca una sola vez', async () => {
    actAs(w.sofia);
    const first = await read(await mark(w.claseCarolina.id));
    expect(first.status).toBe(200);
    expect(first.body.meetLink).toBe('https://meet.google.com/abc-defg-hij');
    await mark(w.claseCarolina.id);
    expect(await prisma.attendance.count({ where: { studentId: w.sofia.id } })).toBe(1);
  });

  it('una mentora ajena no accede a la clase; la propia sí y no registra asistencia', async () => {
    actAs(w.valeria);
    expect((await read(await mark(w.claseCarolina.id))).status).toBe(403);

    actAs(w.carolina);
    const own = await read(await mark(w.claseCarolina.id));
    expect(own.status).toBe(200);
    expect(await prisma.attendance.count()).toBe(0);
  });
});

describe('GET /api/admin/attendances', () => {
  beforeEach(async () => {
    await prisma.classEnrollment.create({ data: { classId: w.claseCarolina.id, studentId: w.lucia.id } });
    await prisma.attendance.createMany({
      data: [
        { classId: w.claseCarolina.id, studentId: w.sofia.id },
        { classId: w.claseCarolina.id, studentId: w.lucia.id },
      ],
    });
  });

  it('una estudiante recibe solo su propia asistencia', async () => {
    actAs(w.sofia);
    const res = await read(await getAttendances(request('/api/admin/attendances')));
    expect(res.body.attendances).toHaveLength(1);
    expect(res.body.attendances[0].student.id).toBe(w.sofia.id);
    expect(res.raw).not.toContain('lucia@prueba.test');
  });

  it('una mentora ve la asistencia de sus clases y no la de otras', async () => {
    actAs(w.carolina);
    expect((await read(await getAttendances(request('/api/admin/attendances')))).body.attendances).toHaveLength(2);

    actAs(w.valeria);
    expect((await read(await getAttendances(request('/api/admin/attendances')))).body.attendances).toHaveLength(0);
  });

  it('la administradora ve todo y una persona anónima nada', async () => {
    actAs(w.admin);
    expect((await read(await getAttendances(request('/api/admin/attendances')))).body.attendances).toHaveLength(2);

    actAs(null);
    expect((await read(await getAttendances(request('/api/admin/attendances')))).status).toBe(401);
  });
});
