import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE, GET, POST, PUT } from '@/app/api/classes/route';
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

describe('GET /api/classes', () => {
  it('rechaza a una persona anónima', async () => {
    const res = await read(await GET(request('/api/classes')));
    expect(res.status).toBe(401);
  });

  it('una estudiante ve solo su clase y ningún correo ni documento', async () => {
    actAs(w.sofia);
    const res = await read(await GET(request('/api/classes')));
    expect(res.status).toBe(200);
    expect(res.body.classes).toHaveLength(1);
    expect(res.body.classes[0].title).toBe('Clase de Carolina');
    expect(res.raw).not.toContain('prueba.test');
    expect(res.raw).not.toContain('DOC-');
  });

  it('una estudiante sin inscripción no ve clases', async () => {
    actAs(w.lucia);
    const res = await read(await GET(request('/api/classes')));
    expect(res.body.classes).toHaveLength(0);
  });

  it('una mentora ve solo sus clases y no ve documentos', async () => {
    actAs(w.carolina);
    const res = await read(await GET(request('/api/classes')));
    expect(res.body.classes.map((c: { title: string }) => c.title)).toEqual(['Clase de Carolina']);
    expect(res.raw).not.toContain('DOC-');

    actAs(w.valeria);
    const other = await read(await GET(request('/api/classes')));
    expect(other.body.classes.map((c: { title: string }) => c.title)).toEqual(['Clase de Valeria']);
  });

  it('la administradora ve todas las clases con documento de las inscritas', async () => {
    actAs(w.admin);
    const res = await read(await GET(request('/api/classes')));
    expect(res.body.classes).toHaveLength(2);
    expect(res.raw).toContain('DOC-Sofia');
  });
});

describe('POST /api/classes', () => {
  const start = '2026-12-01T15:00';
  const end = '2026-12-01T17:00';

  it('solo la administradora puede programar clases', async () => {
    for (const actor of [null, w.sofia, w.carolina]) {
      actAs(actor);
      const res = await read(
        await POST(request('/api/classes', { method: 'POST', body: { title: 'X', dateStart: start, dateEnd: end } })),
      );
      expect([401, 403]).toContain(res.status);
    }
  });

  it.each([
    ['enlace de Meet con http', { meetLink: 'http://meet.google.com/abc-defg-hij' }],
    ['enlace de Meet de otro dominio', { meetLink: 'https://meet.google.com.evil.com/x' }],
    ['YouTube con javascript:', { youtubeUrl: 'javascript:alert(1)//embed/dQw4w9WgXcQ' }],
    ['YouTube de otro dominio', { youtubeUrl: 'https://evil.com/watch?v=dQw4w9WgXcQ' }],
    ['fecha de fin anterior al inicio', { dateStart: end, dateEnd: start }],
    ['estado inválido', { status: 'BORRADO' }],
    ['mentora inexistente', { mentorId: 'no-existe' }],
    ['mentora que en realidad es estudiante', { mentorId: 'STUDENT' }],
  ])('rechaza %s', async (_name, override) => {
    actAs(w.admin);
    const body: Record<string, unknown> = {
      title: 'Clase nueva',
      dateStart: start,
      dateEnd: end,
      mentorId: w.carolina.id,
      ...override,
    };
    if (body.mentorId === 'STUDENT') body.mentorId = w.sofia.id;
    const res = await read(await POST(request('/api/classes', { method: 'POST', body })));
    expect(res.status).toBe(400);
  });

  it('crea la clase e ignora ids que no son de estudiantes', async () => {
    actAs(w.admin);
    const res = await read(
      await POST(
        request('/api/classes', {
          method: 'POST',
          body: {
            title: 'Clase nueva',
            dateStart: start,
            dateEnd: end,
            mentorId: w.carolina.id,
            meetLink: 'https://meet.google.com/abc-defg-hij',
            youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
            studentIds: [w.sofia.id, w.lucia.id, w.carolina.id, 'no-existe'],
          },
        }),
      ),
    );
    expect(res.status).toBe(200);
    const created = await prisma.classSession.findFirstOrThrow({
      where: { title: 'Clase nueva' },
      include: { enrollments: true },
    });
    expect(created.monthKey).toBe('2026-12');
    expect(created.enrollments.map((e) => e.studentId).sort()).toEqual([w.sofia.id, w.lucia.id].sort());
  });
});

describe('PUT /api/classes', () => {
  it('una mentora edita los enlaces de su clase pero no otros campos', async () => {
    actAs(w.carolina);
    const res = await read(
      await PUT(
        request('/api/classes', {
          method: 'PUT',
          body: {
            id: w.claseCarolina.id,
            title: 'Título cambiado',
            meetLink: 'https://meet.google.com/zzz-yyyy-xxx',
            youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
            recordingNotes: 'Notas',
          },
        }),
      ),
    );
    expect(res.status).toBe(200);
    const after = await prisma.classSession.findUniqueOrThrow({ where: { id: w.claseCarolina.id } });
    expect(after.title).toBe('Clase de Carolina');
    expect(after.meetLink).toBe('https://meet.google.com/zzz-yyyy-xxx');
    expect(after.recordingNotes).toBe('Notas');
  });

  it('una mentora no puede editar la clase de otra', async () => {
    actAs(w.valeria);
    const res = await read(
      await PUT(request('/api/classes', { method: 'PUT', body: { id: w.claseCarolina.id, meetLink: '' } })),
    );
    expect(res.status).toBe(403);
  });

  it('rechaza enlaces inseguros al editar', async () => {
    actAs(w.carolina);
    const res = await read(
      await PUT(
        request('/api/classes', { method: 'PUT', body: { id: w.claseCarolina.id, meetLink: 'javascript:alert(1)' } }),
      ),
    );
    expect(res.status).toBe(400);
  });

  it('una estudiante no puede editar', async () => {
    actAs(w.sofia);
    const res = await read(await PUT(request('/api/classes', { method: 'PUT', body: { id: w.claseCarolina.id } })));
    expect(res.status).toBe(403);
  });

  it('la administradora reasigna las inscritas y valida el estado', async () => {
    actAs(w.admin);
    const bad = await read(
      await PUT(request('/api/classes', { method: 'PUT', body: { id: w.claseCarolina.id, status: 'BORRADO' } })),
    );
    expect(bad.status).toBe(400);

    const ok = await read(
      await PUT(
        request('/api/classes', {
          method: 'PUT',
          body: { id: w.claseCarolina.id, studentIds: [w.lucia.id], status: 'FINALIZADA' },
        }),
      ),
    );
    expect(ok.status).toBe(200);
    const enrollments = await prisma.classEnrollment.findMany({ where: { classId: w.claseCarolina.id } });
    expect(enrollments.map((e) => e.studentId)).toEqual([w.lucia.id]);
  });

  it('responde 404 si la clase no existe', async () => {
    actAs(w.admin);
    const res = await read(await PUT(request('/api/classes', { method: 'PUT', body: { id: 'no-existe' } })));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/classes', () => {
  it('solo la administradora elimina clases', async () => {
    actAs(w.carolina);
    const denied = await read(await DELETE(request(`/api/classes?id=${w.claseCarolina.id}`, { method: 'DELETE' })));
    expect(denied.status).toBe(403);

    actAs(w.admin);
    const ok = await read(await DELETE(request(`/api/classes?id=${w.claseCarolina.id}`, { method: 'DELETE' })));
    expect(ok.status).toBe(200);
    expect(await prisma.classSession.count({ where: { id: w.claseCarolina.id } })).toBe(0);
  });
});

describe('afiche de la clase', () => {
  const body = (extra: Record<string, unknown> = {}) => ({
    title: 'Con afiche',
    dateStart: new Date(2026, 9, 6, 15).toISOString(),
    dateEnd: new Date(2026, 9, 6, 17).toISOString(),
    mentorId: w.carolina.id,
    ...extra,
  });

  it('la administradora crea la clase con un afiche propio y la lista devuelve una URL firmada', async () => {
    actAs(w.admin);
    const key = `clases/${w.admin.id}/afiche.png`;
    const created = await read(await POST(request('/api/classes', { method: 'POST', body: body({ imageKey: key }) })));
    expect(created.status).toBe(200);
    expect(
      (await prisma.classSession.findUniqueOrThrow({ where: { id: created.body.classSession.id } })).imageKey,
    ).toBe(key);

    const list = await read(await GET(request('/api/classes')));
    const cls = list.body.classes.find((c: { id: string }) => c.id === created.body.classSession.id);
    expect(cls.imageUrl).toBe(`https://firmada.test/${key}`);
  });

  it('rechaza un afiche que no está en la carpeta de quien lo sube', async () => {
    actAs(w.admin);
    const res = await read(
      await POST(
        request('/api/classes', { method: 'POST', body: body({ imageKey: `clases/${w.lucia.id}/ajeno.png` }) }),
      ),
    );
    expect(res.status).toBe(400);
  });

  it('la mentora de la clase puede cambiar y quitar el afiche; el anterior se elimina', async () => {
    const { deleteObject } = await import('@/lib/s3');
    const old = `clases/${w.admin.id}/viejo.png`;
    await prisma.classSession.update({ where: { id: w.claseCarolina.id }, data: { imageKey: old } });

    actAs(w.carolina);
    const fresh = `clases/${w.carolina.id}/nuevo.png`;
    const put = (extra: Record<string, unknown>) =>
      PUT(request('/api/classes', { method: 'PUT', body: { id: w.claseCarolina.id, ...extra } }));

    expect((await read(await put({ imageKey: fresh }))).status).toBe(200);
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: w.claseCarolina.id } })).imageKey).toBe(fresh);
    expect(deleteObject).toHaveBeenCalledWith(old);

    expect((await read(await put({ imageKey: null }))).status).toBe(200);
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: w.claseCarolina.id } })).imageKey).toBeNull();
    expect(deleteObject).toHaveBeenCalledWith(fresh);
  });

  it('otra mentora no toca el afiche de una clase ajena', async () => {
    actAs(w.valeria);
    const res = await read(
      await PUT(request('/api/classes', { method: 'PUT', body: { id: w.claseCarolina.id, imageKey: null } })),
    );
    expect(res.status).toBe(403);
  });
});
