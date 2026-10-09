import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DELETE as deleteAssignment,
  GET as listAssignments,
  POST as createAssignment,
  PUT as updateAssignment,
} from '@/app/api/assignments/route';
import { DELETE as deleteSubmission, POST as submit } from '@/app/api/submissions/route';
import type { Requirement } from '@/lib/delivery';
import { middleware } from '@/middleware';
import prisma from '@/lib/prisma';
import { deleteObject } from '@/lib/s3';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const LINK = 'https://docs.google.com/document/d/abc';
const LONG_TEXT = 'Esta es mi reflexión completa sobre el tema de la clase.';

interface Kinds {
  file: Requirement;
  link: Requirement;
  text: Requirement;
  maxFiles?: number;
}

/** Crea una tarea en la clase de Carolina (donde está Sofia) pidiendo lo indicado para cada tipo. */
async function taskWith(kinds: Kinds, extra: Record<string, unknown> = {}) {
  return prisma.assignment.create({
    data: {
      classId: w.claseCarolina.id,
      creatorId: w.carolina.id,
      title: 'Tarea de prueba',
      description: 'Instrucciones de la tarea',
      dueDate: new Date(Date.now() + 86400000),
      fileRequirement: kinds.file,
      linkRequirement: kinds.link,
      textRequirement: kinds.text,
      maxFiles: kinds.maxFiles ?? 1,
      ...extra,
    },
  });
}

const mine = (name: string) => ({ key: `entregas/${w.sofia.id}/${name}`, name });

const deliver = async (assignmentId: string, body: Record<string, unknown>) => {
  actAs(w.sofia);
  return read(await submit(request('/api/submissions', { method: 'POST', body: { assignmentId, ...body } })));
};

describe('crear una tarea: validación y confirmación', () => {
  const body = (extra: Record<string, unknown> = {}) => ({
    classId: w.claseCarolina.id,
    title: 'Ensayo final',
    description: 'Escribe un ensayo de una página.',
    dueDate: inDays(5),
    ...extra,
  });
  const create = async (extra: Record<string, unknown> = {}) => {
    actAs(w.carolina);
    return read(await createAssignment(request('/api/assignments', { method: 'POST', body: body(extra) })));
  };

  it('guarda con lo de siempre y confirma a cuántas estudiantes llega', async () => {
    const res = await create();
    expect(res.status).toBe(200);
    expect(res.body.assignedTo).toBe(1);
    expect(res.body.notified).toBe(1);
    expect(res.body.assignment).toMatchObject({
      fileRequirement: 'OPTIONAL',
      linkRequirement: 'OPTIONAL',
      textRequirement: 'REQUIRED',
      maxFiles: 1,
      allowLate: true,
    });
  });

  it('guarda los requisitos elegidos y el máximo de archivos', async () => {
    const res = await create({
      fileRequirement: 'REQUIRED',
      linkRequirement: 'OPTIONAL',
      textRequirement: 'NONE',
      maxFiles: 3,
      allowLate: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.assignment).toMatchObject({
      fileRequirement: 'REQUIRED',
      linkRequirement: 'OPTIONAL',
      textRequirement: 'NONE',
      maxFiles: 3,
      allowLate: false,
    });
  });

  it('entiende la forma antigua (tipo de entrega + comentario) de una pestaña abierta antes del cambio', async () => {
    const res = await create({ deliveryType: 'LINK', notesRequired: false });
    expect(res.body.assignment).toMatchObject({
      fileRequirement: 'NONE',
      linkRequirement: 'REQUIRED',
      textRequirement: 'OPTIONAL',
    });
    const text = await create({ deliveryType: 'TEXT' });
    expect(text.body.assignment).toMatchObject({
      fileRequirement: 'NONE',
      linkRequirement: 'NONE',
      textRequirement: 'REQUIRED',
    });
  });

  it('exige elegir al menos una forma de entrega y limita los archivos a 3', async () => {
    const none = await create({ fileRequirement: 'NONE', linkRequirement: 'NONE', textRequirement: 'NONE' });
    expect(none.status).toBe(400);
    expect(none.body.fields.delivery).toContain('al menos una forma');
    const many = await create({ fileRequirement: 'REQUIRED', maxFiles: 9 });
    expect(many.status).toBe(400);
    expect(many.body.fields.maxFiles).toBeDefined();
    expect(await prisma.assignment.count({ where: { title: 'Ensayo final' } })).toBe(0);
  });

  it('una clase sin estudiantes inscritas guarda la tarea y lo dice (assignedTo 0)', async () => {
    actAs(w.valeria);
    const res = await read(
      await createAssignment(
        request('/api/assignments', { method: 'POST', body: body({ classId: w.claseValeria.id }) }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body.assignedTo).toBe(0);
  });

  it('indica qué campo falla', async () => {
    const short = await create({ title: 'ab', description: 'corta' });
    expect(short.status).toBe(400);
    expect(short.body.fields.title).toContain('al menos 3');
    expect(short.body.fields.description).toContain('mínimo 10');
    const noDate = await create({ dueDate: undefined });
    expect(noDate.body.fields.dueDate).toContain('fecha');
    const badType = await create({ fileRequirement: 'TAL VEZ' });
    expect(badType.body.fields.fileRequirement).toBeDefined();
  });

  it('no acepta una fecha límite pasada al crear, pero sí conservarla al editar', async () => {
    const past = await create({ dueDate: inDays(-2) });
    expect(past.status).toBe(400);
    expect(past.body.fields.dueDate).toContain('futura');

    const old = await taskWith(
      { file: 'OPTIONAL', link: 'OPTIONAL', text: 'REQUIRED' },
      { dueDate: new Date(Date.now() - 86400000) },
    );
    actAs(w.carolina);
    const edit = (dueDate: string) =>
      updateAssignment(
        request('/api/assignments', {
          method: 'PUT',
          body: { id: old.id, title: 'Título nuevo', description: 'Instrucciones nuevas', dueDate },
        }),
      );
    expect((await read(await edit(old.dueDate.toISOString()))).status).toBe(200);
    expect((await read(await edit(inDays(-5)))).status).toBe(400);
  });

  it('al editar solo cambia lo que se envía', async () => {
    const t = await taskWith({ file: 'NONE', link: 'REQUIRED', text: 'OPTIONAL' }, { allowLate: false });
    actAs(w.carolina);
    await updateAssignment(
      request('/api/assignments', {
        method: 'PUT',
        body: { id: t.id, title: 'Otro título', description: 'Otras instrucciones', dueDate: inDays(3) },
      }),
    );
    expect(await prisma.assignment.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({
      fileRequirement: 'NONE',
      linkRequirement: 'REQUIRED',
      textRequirement: 'OPTIONAL',
      allowLate: false,
    });
    await updateAssignment(
      request('/api/assignments', {
        method: 'PUT',
        body: {
          id: t.id,
          title: 'Otro título',
          description: 'Otras instrucciones',
          dueDate: inDays(3),
          fileRequirement: 'REQUIRED',
          maxFiles: 2,
        },
      }),
    );
    expect(await prisma.assignment.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({
      fileRequirement: 'REQUIRED',
      linkRequirement: 'REQUIRED',
      maxFiles: 2,
    });
  });
});

describe('qué puede entregar la estudiante según la tarea', () => {
  it('solo archivo: exige el archivo y rechaza el enlace', async () => {
    const t = await taskWith({ file: 'REQUIRED', link: 'NONE', text: 'OPTIONAL' });
    expect((await deliver(t.id, { notes: 'hola' })).status).toBe(400);
    expect((await deliver(t.id, { link: LINK })).body.error).toContain('no recibe enlaces');
    const ok = await deliver(t.id, { files: [mine('trabajo.pdf')] });
    expect(ok.status).toBe(200);
    expect(ok.body.submission).toMatchObject({
      fileKeys: [mine('trabajo.pdf').key],
      fileNames: ['trabajo.pdf'],
      linkUrl: null,
    });
  });

  it('rechaza un archivo que no es suyo o repetido', async () => {
    const t = await taskWith({ file: 'REQUIRED', link: 'NONE', text: 'NONE', maxFiles: 2 });
    const foreign = await deliver(t.id, { files: [{ key: `entregas/${w.lucia.id}/ajeno.pdf`, name: 'ajeno.pdf' }] });
    expect(foreign.status).toBe(400);
    const repeated = await deliver(t.id, { files: [mine('a.pdf'), mine('a.pdf')] });
    expect(repeated.status).toBe(400);
  });

  it('solo enlace: exige un enlace https y rechaza archivos', async () => {
    const t = await taskWith({ file: 'NONE', link: 'REQUIRED', text: 'OPTIONAL' });
    expect((await deliver(t.id, {})).status).toBe(400);
    expect((await deliver(t.id, { link: 'http://inseguro.com' })).status).toBe(400);
    expect((await deliver(t.id, { files: [mine('a.pdf')] })).body.error).toContain('no recibe archivos');
    expect((await deliver(t.id, { link: LINK })).status).toBe(200);
  });

  it('solo texto: pide al menos 20 caracteres y rechaza archivos y enlaces', async () => {
    const t = await taskWith({ file: 'NONE', link: 'NONE', text: 'REQUIRED' });
    expect((await deliver(t.id, {})).status).toBe(400);
    expect((await deliver(t.id, { notes: 'muy corto' })).status).toBe(400);
    expect((await deliver(t.id, { notes: LONG_TEXT, link: LINK })).status).toBe(400);
    const ok = await deliver(t.id, { notes: LONG_TEXT });
    expect(ok.status).toBe(200);
    expect(ok.body.submission).toMatchObject({ fileKeys: [], linkUrl: null, notes: LONG_TEXT });
  });

  it('archivo o enlace (con uno basta, sin texto): acepta cualquiera de los dos o los dos', async () => {
    const t = await taskWith({ file: 'OPTIONAL', link: 'OPTIONAL', text: 'NONE' });
    expect((await deliver(t.id, {})).status).toBe(400);
    expect((await deliver(t.id, { notes: 'solo texto largo que no se acepta aquí' })).status).toBe(400);
    expect((await deliver(t.id, { link: LINK })).status).toBe(200);
    expect((await deliver(t.id, { files: [mine('a.pdf')] })).status).toBe(200);
    const both = await deliver(t.id, { files: [mine('a.pdf')], link: LINK });
    expect(both.status).toBe(200);
    expect(both.body.submission).toMatchObject({ fileKeys: [mine('a.pdf').key], linkUrl: LINK });
  });

  it('texto obligatorio + archivo opcional + enlace opcional', async () => {
    const t = await taskWith({ file: 'OPTIONAL', link: 'OPTIONAL', text: 'REQUIRED' });
    expect((await deliver(t.id, { files: [mine('a.pdf')] })).body.error).toContain('texto');
    expect((await deliver(t.id, { notes: 'Mi reflexión' })).status).toBe(200);
    expect((await deliver(t.id, { notes: 'Mi reflexión', files: [mine('a.pdf')], link: LINK })).status).toBe(200);
  });

  it('varios archivos: respeta el máximo de la tarea', async () => {
    const t = await taskWith({ file: 'REQUIRED', link: 'NONE', text: 'NONE', maxFiles: 3 });
    const three = await deliver(t.id, { files: [mine('1.pdf'), mine('2.docx'), mine('3.png')] });
    expect(three.status).toBe(200);
    expect(three.body.submission.fileNames).toEqual(['1.pdf', '2.docx', '3.png']);
    const four = await deliver(t.id, { files: [mine('1.pdf'), mine('2.pdf'), mine('3.pdf'), mine('4.pdf')] });
    expect(four.status).toBe(400);

    const single = await taskWith({ file: 'REQUIRED', link: 'NONE', text: 'NONE', maxFiles: 1 });
    expect((await deliver(single.id, { files: [mine('1.pdf'), mine('2.pdf')] })).body.error).toContain(
      'un solo archivo',
    );
  });

  it('archivo obligatorio + enlace obligatorio: deben venir los dos', async () => {
    const t = await taskWith({ file: 'REQUIRED', link: 'REQUIRED', text: 'NONE' });
    expect((await deliver(t.id, { files: [mine('a.pdf')] })).status).toBe(400);
    expect((await deliver(t.id, { link: LINK })).status).toBe(400);
    expect((await deliver(t.id, { files: [mine('a.pdf')], link: LINK })).status).toBe(200);
  });

  it('sigue aceptando la forma antigua (un archivo o un enlace) de una pestaña abierta antes del cambio', async () => {
    const t = await taskWith({ file: 'OPTIONAL', link: 'OPTIONAL', text: 'REQUIRED' });
    const link = await deliver(t.id, { notes: 'x', fileType: 'LINK', fileUrl: LINK });
    expect(link.status).toBe(200);
    expect(link.body.submission).toMatchObject({ linkUrl: LINK, fileUrl: null });
    const file = await deliver(t.id, { notes: 'x', fileType: 'PDF', fileUrl: mine('viejo.pdf').key });
    expect(file.status).toBe(200);
    expect(file.body.submission.fileKeys).toEqual([mine('viejo.pdf').key]);
  });
});

describe('entregas tardías, reentregas y cierre', () => {
  it('después de la fecha límite se acepta y queda marcada con retraso', async () => {
    const t = await taskWith(
      { file: 'NONE', link: 'REQUIRED', text: 'NONE' },
      { dueDate: new Date(Date.now() - 3600000) },
    );
    const res = await deliver(t.id, { link: LINK });
    expect(res.status).toBe(200);
    expect(res.body.late).toBe(true);
    const onTime = await taskWith({ file: 'NONE', link: 'REQUIRED', text: 'NONE' });
    expect((await deliver(onTime.id, { link: LINK })).body.late).toBe(false);
  });

  it('si la tarea no acepta entregas tardías, después de la fecha límite responde 403', async () => {
    const t = await taskWith(
      { file: 'NONE', link: 'REQUIRED', text: 'NONE' },
      { allowLate: false, dueDate: new Date(Date.now() - 3600000) },
    );
    const res = await deliver(t.id, { link: LINK });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('fecha límite');
    expect(await prisma.submission.count({ where: { assignmentId: t.id } })).toBe(0);
  });

  it('reentregar reemplaza la entrega y borra los archivos que ya no están', async () => {
    const t = await taskWith({ file: 'OPTIONAL', link: 'OPTIONAL', text: 'NONE', maxFiles: 3 });
    await deliver(t.id, { files: [mine('a.pdf'), mine('b.pdf')] });
    const second = await deliver(t.id, { files: [mine('b.pdf'), mine('c.pdf')] });
    expect(second.status).toBe(200);
    expect(await prisma.submission.count({ where: { assignmentId: t.id } })).toBe(1);
    expect(deleteObject).toHaveBeenCalledWith(mine('a.pdf').key);
    expect(deleteObject).not.toHaveBeenCalledWith(mine('b.pdf').key);
  });

  it('una entrega calificada queda cerrada', async () => {
    const t = await taskWith({ file: 'NONE', link: 'REQUIRED', text: 'NONE' });
    await deliver(t.id, { link: LINK });
    await prisma.submission.updateMany({ where: { assignmentId: t.id }, data: { grade: 4 } });
    expect((await deliver(t.id, { link: LINK })).status).toBe(409);
  });

  it('quitar la entrega o eliminar la tarea borra todos los archivos', async () => {
    const t = await taskWith({ file: 'REQUIRED', link: 'NONE', text: 'NONE', maxFiles: 2 });
    await deliver(t.id, { files: [mine('uno.pdf'), mine('dos.pdf')] });
    actAs(w.sofia);
    const removed = await read(
      await deleteSubmission(request(`/api/submissions?assignmentId=${t.id}`, { method: 'DELETE' })),
    );
    expect(removed.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(mine('uno.pdf').key);
    expect(deleteObject).toHaveBeenCalledWith(mine('dos.pdf').key);

    await deliver(t.id, { files: [mine('tres.pdf')] });
    actAs(w.carolina);
    await deleteAssignment(request(`/api/assignments?id=${t.id}`, { method: 'DELETE' }));
    expect(deleteObject).toHaveBeenCalledWith(mine('tres.pdf').key);
  });

  it('una estudiante no inscrita en la clase no puede entregar', async () => {
    const t = await taskWith({ file: 'NONE', link: 'REQUIRED', text: 'NONE' });
    actAs(w.lucia);
    const res = await read(
      await submit(request('/api/submissions', { method: 'POST', body: { assignmentId: t.id, link: LINK } })),
    );
    expect(res.status).toBe(403);
  });
});

describe('sesión vencida en la API', () => {
  it('una llamada a /api sin sesión recibe 401 en JSON y no una redirección al login', async () => {
    const res = await middleware(new NextRequest('http://localhost/api/assignments', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain('sesión');
    expect(res.headers.get('location')).toBeNull();
  });

  it('las páginas sin sesión siguen redirigiendo al login', async () => {
    const res = await middleware(new NextRequest('http://localhost/mentor/tareas'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});

describe('instrucciones en un archivo (PDF o documento)', () => {
  const pdf = () => ({ key: `tareas/${w.carolina.id}/instrucciones.pdf`, name: 'instrucciones.pdf' });
  const base = (extra: Record<string, unknown> = {}) => ({
    classId: w.claseCarolina.id,
    title: 'Ensayo con PDF',
    dueDate: inDays(5),
    ...extra,
  });
  const create = async (extra: Record<string, unknown> = {}) => {
    actAs(w.carolina);
    return read(await createAssignment(request('/api/assignments', { method: 'POST', body: base(extra) })));
  };
  const edit = async (id: string, extra: Record<string, unknown>) => {
    actAs(w.carolina);
    return read(
      await updateAssignment(
        request('/api/assignments', {
          method: 'PUT',
          body: { id, title: 'Ensayo con PDF', description: '', dueDate: inDays(5), ...extra },
        }),
      ),
    );
  };

  it('se puede crear solo con el PDF, sin texto de instrucciones', async () => {
    const res = await create({ attachment: pdf() });
    expect(res.status).toBe(200);
    expect(res.body.assignment).toMatchObject({ attachmentName: 'instrucciones.pdf', description: '' });
    expect(res.body.assignment.attachmentKey).toBeUndefined();
    expect(res.body.assignment.attachmentUrl).toBe(`https://firmada.test/${pdf().key}`);
  });

  it('sin texto y sin archivo pide instrucciones', async () => {
    const res = await create({});
    expect(res.status).toBe(400);
    expect(res.body.fields.description).toContain('adjunta un archivo');
    expect((await create({ description: 'corto' })).status).toBe(400);
  });

  it('rechaza un archivo que no es de quien lo sube', async () => {
    const res = await create({ attachment: { key: `tareas/${w.valeria.id}/ajeno.pdf`, name: 'ajeno.pdf' } });
    expect(res.status).toBe(400);
    expect(res.body.fields.attachment).toBeDefined();
    expect(await prisma.assignment.count({ where: { title: 'Ensayo con PDF' } })).toBe(0);
  });

  it('la estudiante inscrita recibe la dirección del archivo y no ve la clave interna', async () => {
    await create({ attachment: pdf() });
    actAs(w.sofia);
    const res = await read(await listAssignments(request('/api/assignments')));
    const task = res.body.assignments.find((a: { title: string }) => a.title === 'Ensayo con PDF');
    expect(task.attachmentUrl).toBe(`https://firmada.test/${pdf().key}`);
    expect(res.raw).not.toContain('attachmentKey');

    actAs(w.lucia);
    const other = await read(await listAssignments(request('/api/assignments')));
    expect(other.body.assignments.find((a: { title: string }) => a.title === 'Ensayo con PDF')).toBeUndefined();
  });

  it('al editar: sin cambios conserva el archivo, reemplazar o quitar borra el anterior', async () => {
    const created = await create({ attachment: pdf() });
    const id = created.body.assignment.id;

    const keep = await edit(id, { description: 'Instrucciones nuevas escritas' });
    expect(keep.body.assignment.attachmentName).toBe('instrucciones.pdf');

    const next = { key: `tareas/${w.carolina.id}/segunda.docx`, name: 'segunda.docx' };
    const replaced = await edit(id, { attachment: next });
    expect(replaced.body.assignment.attachmentName).toBe('segunda.docx');
    expect(deleteObject).toHaveBeenCalledWith(pdf().key);

    expect((await edit(id, { attachment: null })).status).toBe(400);
    const removed = await edit(id, { attachment: null, description: 'Instrucciones escritas completas' });
    expect(removed.body.assignment.attachmentName).toBeNull();
    expect(deleteObject).toHaveBeenCalledWith(next.key);
  });

  it('eliminar la tarea borra también el archivo de las instrucciones', async () => {
    const created = await create({ attachment: pdf() });
    actAs(w.carolina);
    const res = await read(
      await deleteAssignment(request(`/api/assignments?id=${created.body.assignment.id}`, { method: 'DELETE' })),
    );
    expect(res.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(pdf().key);
  });
});
