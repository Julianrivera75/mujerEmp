import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createAssignment, PUT as updateAssignment } from '@/app/api/assignments/route';
import { POST as submit } from '@/app/api/submissions/route';
import { middleware } from '@/middleware';
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

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const LINK = 'https://docs.google.com/document/d/abc';

/** Crea una tarea nueva en la clase de Carolina (donde está Sofia) con el tipo de entrega indicado. */
async function taskWith(extra: Record<string, unknown> = {}) {
  return prisma.assignment.create({
    data: {
      classId: w.claseCarolina.id,
      creatorId: w.carolina.id,
      title: 'Tarea de prueba',
      description: 'Instrucciones de la tarea',
      dueDate: new Date(Date.now() + 86400000),
      ...extra,
    },
  });
}

const deliver = async (assignmentId: string, body: Record<string, unknown>) => {
  actAs(w.sofia);
  return read(await submit(request('/api/submissions', { method: 'POST', body: { assignmentId, ...body } })));
};

const LONG_TEXT = 'Esta es mi reflexión completa sobre el tema de la clase.';

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

  it('guarda con los valores de siempre y confirma a cuántas estudiantes llega', async () => {
    const res = await create();
    expect(res.status).toBe(200);
    expect(res.body.assignedTo).toBe(1);
    expect(res.body.notified).toBe(1);
    expect(res.body.assignment).toMatchObject({ deliveryType: 'FILE_OR_LINK', notesRequired: true, allowLate: true });
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

  it('guarda el tipo de entrega elegido', async () => {
    const res = await create({ deliveryType: 'TEXT', notesRequired: false, allowLate: false });
    expect(res.body.assignment).toMatchObject({ deliveryType: 'TEXT', notesRequired: false, allowLate: false });
  });

  it('indica qué campo falla', async () => {
    const short = await create({ title: 'ab', description: 'corta' });
    expect(short.status).toBe(400);
    expect(short.body.fields.title).toContain('al menos 3');
    expect(short.body.fields.description).toContain('mínimo 10');

    const noDate = await create({ dueDate: undefined });
    expect(noDate.status).toBe(400);
    expect(noDate.body.fields.dueDate).toContain('fecha');

    const badType = await create({ deliveryType: 'CARTA' });
    expect(badType.status).toBe(400);
    expect(badType.body.fields.deliveryType).toBeDefined();
    expect(await prisma.assignment.count({ where: { title: 'Ensayo final' } })).toBe(0);
  });

  it('no acepta una fecha límite pasada al crear, pero sí conservarla al editar', async () => {
    const past = await create({ dueDate: inDays(-2) });
    expect(past.status).toBe(400);
    expect(past.body.fields.dueDate).toContain('futura');

    const old = await taskWith({ dueDate: new Date(Date.now() - 86400000) });
    actAs(w.carolina);
    const keep = await read(
      await updateAssignment(
        request('/api/assignments', {
          method: 'PUT',
          body: {
            id: old.id,
            title: 'Título nuevo',
            description: 'Instrucciones nuevas',
            dueDate: old.dueDate.toISOString(),
          },
        }),
      ),
    );
    expect(keep.status).toBe(200);
    const change = await read(
      await updateAssignment(
        request('/api/assignments', {
          method: 'PUT',
          body: { id: old.id, title: 'Título nuevo', description: 'Instrucciones nuevas', dueDate: inDays(-5) },
        }),
      ),
    );
    expect(change.status).toBe(400);
  });

  it('al editar solo cambia el tipo de entrega si se envía', async () => {
    const t = await taskWith({ deliveryType: 'LINK', allowLate: false });
    actAs(w.carolina);
    await updateAssignment(
      request('/api/assignments', {
        method: 'PUT',
        body: { id: t.id, title: 'Otro título', description: 'Otras instrucciones', dueDate: inDays(3) },
      }),
    );
    expect(await prisma.assignment.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({
      deliveryType: 'LINK',
      allowLate: false,
    });
  });
});

describe('qué puede entregar la estudiante según la tarea', () => {
  it('FILE: exige un archivo y rechaza el enlace', async () => {
    const t = await taskWith({ deliveryType: 'FILE', notesRequired: false });
    expect((await deliver(t.id, { notes: 'hola' })).status).toBe(400);
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: LINK })).body.error).toContain('archivo');
    const ok = await deliver(t.id, { fileType: 'PDF', fileUrl: `entregas/${w.sofia.id}/trabajo.pdf` });
    expect(ok.status).toBe(200);
    expect(ok.body.submission).toMatchObject({ fileType: 'PDF' });
  });

  it('FILE: rechaza un archivo que no es suyo', async () => {
    const t = await taskWith({ deliveryType: 'FILE', notesRequired: false });
    const res = await deliver(t.id, { fileType: 'PDF', fileUrl: `entregas/${w.lucia.id}/ajeno.pdf` });
    expect(res.status).toBe(400);
  });

  it('LINK: exige un enlace https y rechaza archivos', async () => {
    const t = await taskWith({ deliveryType: 'LINK', notesRequired: false });
    expect((await deliver(t.id, {})).status).toBe(400);
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: 'http://inseguro.com' })).status).toBe(400);
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: '' })).status).toBe(400);
    expect((await deliver(t.id, { fileType: 'PDF', fileUrl: `entregas/${w.sofia.id}/a.pdf` })).body.error).toContain(
      'enlace',
    );
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: LINK })).status).toBe(200);
  });

  it('TEXT: exige texto de al menos 20 caracteres y rechaza archivo o enlace', async () => {
    const t = await taskWith({ deliveryType: 'TEXT' });
    expect((await deliver(t.id, {})).status).toBe(400);
    expect((await deliver(t.id, { notes: 'muy corto' })).status).toBe(400);
    expect((await deliver(t.id, { notes: LONG_TEXT, fileType: 'LINK', fileUrl: LINK })).status).toBe(400);
    const ok = await deliver(t.id, { notes: LONG_TEXT });
    expect(ok.status).toBe(200);
    expect(ok.body.submission).toMatchObject({ fileType: null, fileUrl: null, notes: LONG_TEXT });
  });

  it('FILE_OR_LINK: acepta uno de los dos y exige al menos uno', async () => {
    const t = await taskWith({ deliveryType: 'FILE_OR_LINK', notesRequired: false });
    expect((await deliver(t.id, { notes: 'solo texto' })).status).toBe(400);
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: LINK })).status).toBe(200);
    expect((await deliver(t.id, { fileType: 'PDF', fileUrl: `entregas/${w.sofia.id}/trabajo.pdf` })).status).toBe(200);
  });

  it('ANY: basta texto largo, archivo o enlace; vacío no', async () => {
    const t = await taskWith({ deliveryType: 'ANY', notesRequired: false });
    expect((await deliver(t.id, {})).status).toBe(400);
    expect((await deliver(t.id, { notes: 'corto' })).status).toBe(400);
    expect((await deliver(t.id, { notes: LONG_TEXT })).status).toBe(200);
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: LINK })).status).toBe(200);
  });

  it('el comentario obligatorio se exige en los tipos con archivo o enlace', async () => {
    const t = await taskWith({ deliveryType: 'LINK', notesRequired: true });
    const sinComentario = await deliver(t.id, { fileType: 'LINK', fileUrl: LINK });
    expect(sinComentario.status).toBe(400);
    expect(sinComentario.body.error).toContain('comentario');
    expect((await deliver(t.id, { notes: 'Mi reflexión', fileType: 'LINK', fileUrl: LINK })).status).toBe(200);
  });

  it('las tareas anteriores (valores por defecto) piden archivo o enlace y comentario, como antes', async () => {
    const t = await taskWith();
    expect(t).toMatchObject({ deliveryType: 'FILE_OR_LINK', notesRequired: true, allowLate: true });
    expect((await deliver(t.id, { notes: 'x' })).status).toBe(400);
    expect((await deliver(t.id, { notes: 'x', fileType: 'LINK', fileUrl: LINK })).status).toBe(200);
  });
});

describe('entregas tardías, reentregas y cierre', () => {
  it('después de la fecha límite se acepta y queda marcada con retraso', async () => {
    const t = await taskWith({ deliveryType: 'LINK', notesRequired: false, dueDate: new Date(Date.now() - 3600000) });
    const res = await deliver(t.id, { fileType: 'LINK', fileUrl: LINK });
    expect(res.status).toBe(200);
    expect(res.body.late).toBe(true);
    const onTime = await taskWith({ deliveryType: 'LINK', notesRequired: false });
    expect((await deliver(onTime.id, { fileType: 'LINK', fileUrl: LINK })).body.late).toBe(false);
  });

  it('si la tarea no acepta entregas tardías, después de la fecha límite responde 403', async () => {
    const t = await taskWith({
      deliveryType: 'LINK',
      notesRequired: false,
      allowLate: false,
      dueDate: new Date(Date.now() - 3600000),
    });
    const res = await deliver(t.id, { fileType: 'LINK', fileUrl: LINK });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('fecha límite');
    expect(await prisma.submission.count({ where: { assignmentId: t.id } })).toBe(0);
  });

  it('reentregar reemplaza la entrega y una entrega calificada queda cerrada', async () => {
    const t = await taskWith({ deliveryType: 'LINK', notesRequired: false });
    await deliver(t.id, { fileType: 'LINK', fileUrl: LINK });
    const second = await deliver(t.id, { fileType: 'LINK', fileUrl: `${LINK}-2` });
    expect(second.status).toBe(200);
    expect(await prisma.submission.count({ where: { assignmentId: t.id } })).toBe(1);

    await prisma.submission.updateMany({ where: { assignmentId: t.id }, data: { grade: 4 } });
    expect((await deliver(t.id, { fileType: 'LINK', fileUrl: LINK })).status).toBe(409);
  });

  it('una estudiante no inscrita en la clase no puede entregar', async () => {
    const t = await taskWith({ deliveryType: 'LINK', notesRequired: false });
    actAs(w.lucia);
    const res = await read(
      await submit(
        request('/api/submissions', {
          method: 'POST',
          body: { assignmentId: t.id, fileType: 'LINK', fileUrl: LINK },
        }),
      ),
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

describe('instrucciones en un archivo (PDF)', () => {
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
    const short = await create({ description: 'corto' });
    expect(short.status).toBe(400);
  });

  it('rechaza un archivo que no es de quien lo sube', async () => {
    const res = await create({ attachment: { key: `tareas/${w.valeria.id}/ajeno.pdf`, name: 'ajeno.pdf' } });
    expect(res.status).toBe(400);
    expect(res.body.fields.attachment).toBeDefined();
    expect(await prisma.assignment.count({ where: { title: 'Ensayo con PDF' } })).toBe(0);
  });

  it('la estudiante inscrita recibe la dirección del PDF y no ve la clave interna', async () => {
    await create({ attachment: pdf() });
    actAs(w.sofia);
    const { GET: list } = await import('@/app/api/assignments/route');
    const res = await read(await list(request('/api/assignments')));
    const mine = res.body.assignments.find((a: { title: string }) => a.title === 'Ensayo con PDF');
    expect(mine.attachmentUrl).toBe(`https://firmada.test/${pdf().key}`);
    expect(res.raw).not.toContain('attachmentKey');

    actAs(w.lucia);
    const other = await read(await list(request('/api/assignments')));
    expect(other.body.assignments.find((a: { title: string }) => a.title === 'Ensayo con PDF')).toBeUndefined();
  });

  it('al editar: sin cambios conserva el archivo, reemplazar o quitar borra el anterior', async () => {
    const { deleteObject } = await import('@/lib/s3');
    const created = await create({ attachment: pdf() });
    const id = created.body.assignment.id;

    const keep = await edit(id, { description: 'Instrucciones nuevas escritas' });
    expect(keep.status).toBe(200);
    expect(keep.body.assignment.attachmentName).toBe('instrucciones.pdf');

    const next = { key: `tareas/${w.carolina.id}/segunda.pdf`, name: 'segunda.pdf' };
    const replaced = await edit(id, { attachment: next });
    expect(replaced.body.assignment.attachmentName).toBe('segunda.pdf');
    expect(deleteObject).toHaveBeenCalledWith(pdf().key);

    // Quitar el archivo sin texto de instrucciones no se permite; con texto sí.
    expect((await edit(id, { attachment: null })).status).toBe(400);
    const removed = await edit(id, { attachment: null, description: 'Instrucciones escritas completas' });
    expect(removed.status).toBe(200);
    expect(removed.body.assignment.attachmentName).toBeNull();
    expect(deleteObject).toHaveBeenCalledWith(next.key);
  });

  it('eliminar la tarea borra también el PDF de las instrucciones', async () => {
    const { deleteObject } = await import('@/lib/s3');
    const { DELETE: remove } = await import('@/app/api/assignments/route');
    const created = await create({ attachment: pdf() });
    actAs(w.carolina);
    const res = await read(
      await remove(request(`/api/assignments?id=${created.body.assignment.id}`, { method: 'DELETE' })),
    );
    expect(res.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(pdf().key);
  });
});
