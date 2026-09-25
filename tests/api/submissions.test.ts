import { beforeEach, describe, expect, it } from 'vitest';
import { POST, PUT } from '@/app/api/submissions/route';
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

const submit = (body: Record<string, unknown>) => POST(request('/api/submissions', { method: 'POST', body }));
const grade = (body: Record<string, unknown>) => PUT(request('/api/submissions', { method: 'PUT', body }));

describe('POST /api/submissions', () => {
  it('solo las estudiantes entregan', async () => {
    for (const actor of [null, w.carolina, w.admin]) {
      actAs(actor);
      const res = await read(await submit({ assignmentId: w.tarea.id, notes: 'x' }));
      expect(res.status).toBe(403);
    }
  });

  it('una estudiante no inscrita en la clase no puede entregar', async () => {
    actAs(w.lucia);
    const res = await read(await submit({ assignmentId: w.tarea.id, notes: 'x', fileType: 'LINK' }));
    expect(res.status).toBe(403);
  });

  it('valida la tarea y el tipo de entrega', async () => {
    actAs(w.sofia);
    expect((await read(await submit({}))).status).toBe(400);
    expect((await read(await submit({ assignmentId: 'no-existe' }))).status).toBe(404);
    expect((await read(await submit({ assignmentId: w.tarea.id, fileType: 'EXE' }))).status).toBe(400);
  });

  it.each([['javascript:alert(1)'], ['http://drive.google.com/x'], ['no es un enlace']])(
    'rechaza el enlace %s',
    async (fileUrl) => {
      actAs(w.sofia);
      const res = await read(await submit({ assignmentId: w.tarea.id, notes: 'x', fileType: 'LINK', fileUrl }));
      expect(res.status).toBe(400);
    },
  );

  it('acepta un enlace https y actualiza la entrega existente', async () => {
    actAs(w.sofia);
    const res = await read(
      await submit({
        assignmentId: w.tarea.id,
        notes: 'Nueva versión',
        fileType: 'LINK',
        fileUrl: 'https://docs.google.com/document/d/1',
      }),
    );
    expect(res.status).toBe(200);
    const all = await prisma.submission.findMany({ where: { studentId: w.sofia.id } });
    expect(all).toHaveLength(1);
    expect(all[0].notes).toBe('Nueva versión');
    expect(all[0].fileType).toBe('LINK');
  });

  it('un archivo debe estar en la carpeta de la propia estudiante', async () => {
    actAs(w.sofia);
    const foreign = await read(
      await submit({
        assignmentId: w.tarea.id,
        notes: 'x',
        fileType: 'PDF',
        fileUrl: `entregas/${w.lucia.id}/ajeno.pdf`,
      }),
    );
    expect(foreign.status).toBe(400);

    const own = await read(
      await submit({
        assignmentId: w.tarea.id,
        notes: 'x',
        fileType: 'PDF',
        fileUrl: `entregas/${w.sofia.id}/propio.pdf`,
      }),
    );
    expect(own.status).toBe(200);
  });
});

describe('PUT /api/submissions (calificar)', () => {
  it('una estudiante o una persona anónima no califican', async () => {
    for (const actor of [null, w.sofia]) {
      actAs(actor);
      const res = await read(await grade({ submissionId: w.entrega.id, grade: 5 }));
      expect(res.status).toBe(403);
    }
  });

  it('una mentora no califica entregas de la clase de otra', async () => {
    actAs(w.valeria);
    const res = await read(await grade({ submissionId: w.entrega.id, grade: 5, feedback: 'x' }));
    expect(res.status).toBe(403);
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: w.entrega.id } })).grade).toBeNull();
  });

  it.each([[0], [0.9], [5.1], [6], ['abc']])('rechaza la nota %s', async (value) => {
    actAs(w.carolina);
    const res = await read(await grade({ submissionId: w.entrega.id, grade: value }));
    expect(res.status).toBe(400);
  });

  it('la mentora de la clase y la administradora califican', async () => {
    actAs(w.carolina);
    const ok = await read(await grade({ submissionId: w.entrega.id, grade: '4.5', feedback: '  Buen trabajo  ' }));
    expect(ok.status).toBe(200);
    const saved = await prisma.submission.findUniqueOrThrow({ where: { id: w.entrega.id } });
    expect(saved.grade).toBe(4.5);
    expect(saved.feedback).toBe('Buen trabajo');
    expect(saved.gradedAt).not.toBeNull();

    actAs(w.admin);
    expect((await read(await grade({ submissionId: w.entrega.id, grade: 3 }))).status).toBe(200);
  });

  it('una nota vacía la borra y una entrega inexistente da 404', async () => {
    actAs(w.carolina);
    await grade({ submissionId: w.entrega.id, grade: 4 });
    await grade({ submissionId: w.entrega.id, grade: '' });
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: w.entrega.id } })).grade).toBeNull();
    expect((await read(await grade({ submissionId: 'no-existe', grade: 4 }))).status).toBe(404);
    expect((await read(await grade({}))).status).toBe(400);
  });
});
