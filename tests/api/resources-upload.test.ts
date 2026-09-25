import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE, POST as createResource } from '@/app/api/resources/route';
import { GET as readFile, POST as presign } from '@/app/api/upload/route';
import prisma from '@/lib/prisma';
import { verifyUploadedObject } from '@/lib/s3';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const addResource = (body: Record<string, unknown>) =>
  createResource(request('/api/resources', { method: 'POST', body }));

describe('POST /api/resources', () => {
  const base = () => ({ classId: w.claseCarolina.id, title: 'Guía', type: 'LINK', url: 'https://drive.google.com/x' });

  it('solo mentoras y administradoras', async () => {
    for (const actor of [null, w.sofia]) {
      actAs(actor);
      expect((await read(await addResource(base()))).status).toBe(actor ? 403 : 401);
    }
  });

  it('una mentora no agrega materiales a la clase de otra; 404 si la clase no existe', async () => {
    actAs(w.valeria);
    expect((await read(await addResource(base()))).status).toBe(403);
    actAs(w.carolina);
    expect((await read(await addResource({ ...base(), classId: 'no-existe' }))).status).toBe(404);
  });

  it.each([
    ['tipo inválido', { type: 'EXE' }],
    ['enlace http', { url: 'http://drive.google.com/x' }],
    ['enlace javascript:', { url: 'javascript:alert(1)' }],
    ['YouTube en otro dominio', { type: 'YOUTUBE', url: 'https://vimeo.com/1' }],
    ['título vacío', { title: ' ' }],
    ['sin enlace', { url: '' }],
  ])('rechaza %s', async (_name, override) => {
    actAs(w.carolina);
    expect((await read(await addResource({ ...base(), ...override }))).status).toBe(400);
  });

  it('un archivo debe ser de la propia mentora y existir en el almacenamiento', async () => {
    actAs(w.carolina);
    const foreign = await read(
      await addResource({ ...base(), type: 'DOCUMENT', url: `recursos/${w.valeria.id}/guia.pdf` }),
    );
    expect(foreign.status).toBe(400);

    (verifyUploadedObject as unknown as { mockResolvedValueOnce: (v: boolean) => void }).mockResolvedValueOnce(false);
    const missing = await read(
      await addResource({ ...base(), type: 'DOCUMENT', url: `recursos/${w.carolina.id}/guia.pdf` }),
    );
    expect(missing.status).toBe(400);

    const ok = await read(
      await addResource({ ...base(), type: 'DOCUMENT', url: `recursos/${w.carolina.id}/guia.pdf` }),
    );
    expect(ok.status).toBe(200);
  });

  it('crea un enlace y un video válidos', async () => {
    actAs(w.carolina);
    expect((await read(await addResource(base()))).status).toBe(200);
    expect(
      (await read(await addResource({ ...base(), type: 'YOUTUBE', url: 'https://youtu.be/dQw4w9WgXcQ' }))).status,
    ).toBe(200);
    expect(await prisma.classResource.count()).toBe(2);
  });
});

describe('DELETE /api/resources', () => {
  it('respeta los permisos y elimina el material', async () => {
    const resource = await prisma.classResource.create({
      data: { classId: w.claseCarolina.id, title: 'Guía', type: 'LINK', url: 'https://drive.google.com/x' },
    });
    const del = (id?: string) => DELETE(request(`/api/resources${id ? `?id=${id}` : ''}`, { method: 'DELETE' }));

    actAs(w.sofia);
    expect((await read(await del(resource.id))).status).toBe(403);
    actAs(w.valeria);
    expect((await read(await del(resource.id))).status).toBe(403);
    actAs(w.carolina);
    expect((await read(await del())).status).toBe(400);
    expect((await read(await del('no-existe'))).status).toBe(404);
    expect((await read(await del(resource.id))).status).toBe(200);
    expect(await prisma.classResource.count()).toBe(0);
  });
});

describe('POST /api/upload (URL de subida)', () => {
  const ask = (body: Record<string, unknown>) => presign(request('/api/upload', { method: 'POST', body }));
  const valid = { category: 'submission', fileName: 'ensayo.pdf', contentType: 'application/pdf', sizeBytes: 1000 };

  it('exige sesión y respeta quién puede subir a cada categoría', async () => {
    expect((await read(await ask(valid))).status).toBe(401);

    actAs(w.carolina);
    expect((await read(await ask(valid))).status).toBe(403);
    actAs(w.sofia);
    expect((await read(await ask({ ...valid, category: 'resource' }))).status).toBe(403);
    expect((await read(await ask({ ...valid, category: 'certificate' }))).status).toBe(403);
  });

  it.each([
    ['categoría inválida', { category: 'otra' }],
    ['sin nombre', { fileName: '' }],
    ['sin tipo', { contentType: '' }],
    ['tipo no permitido', { contentType: 'application/x-msdownload' }],
    ['sin tamaño', { sizeBytes: undefined }],
    ['tamaño cero', { sizeBytes: 0 }],
    ['tamaño no numérico', { sizeBytes: '10' }],
    ['tamaño excesivo', { sizeBytes: 16 * 1024 * 1024 }],
  ])('rechaza %s', async (_name, override) => {
    actAs(w.sofia);
    expect((await read(await ask({ ...valid, ...override }))).status).toBe(400);
  });

  it('entrega la URL firmada y una clave dentro de la carpeta de la persona', async () => {
    actAs(w.sofia);
    const res = await read(await ask(valid));
    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toContain('https://');
    expect(res.body.key.startsWith(`entregas/${w.sofia.id}/`)).toBe(true);
  });

  it('cualquier persona con sesión puede subir su foto', async () => {
    actAs(w.lucia);
    const res = await read(
      await ask({ category: 'avatar', fileName: 'yo.png', contentType: 'image/png', sizeBytes: 2000 }),
    );
    expect(res.status).toBe(200);
  });
});

describe('GET /api/upload (lectura de archivos)', () => {
  const get = (key?: string) => readFile(request(`/api/upload${key ? `?key=${encodeURIComponent(key)}` : ''}`));
  const submissionKey = () => `entregas/${w.sofia.id}/ensayo.pdf`;

  it('exige sesión, la clave y una categoría conocida', async () => {
    expect((await read(await get(submissionKey()))).status).toBe(401);
    actAs(w.sofia);
    expect((await read(await get())).status).toBe(400);
    expect((await read(await get('secretos/otra-cosa.txt'))).status).toBe(404);
  });

  it('una entrega solo la abren su dueña, su mentora y la administradora', async () => {
    const status = async (actor: Parameters<typeof actAs>[0]) => {
      actAs(actor);
      return (await read(await get(submissionKey()))).status;
    };
    expect(await status(w.sofia)).toBe(200);
    expect(await status(w.carolina)).toBe(200);
    expect(await status(w.admin)).toBe(200);
    expect(await status(w.lucia)).toBe(403);
    expect(await status(w.valeria)).toBe(403);
  });

  it('los materiales de clase los abre cualquier persona con sesión', async () => {
    actAs(w.lucia);
    expect((await read(await get(`recursos/${w.carolina.id}/guia.pdf`))).status).toBe(200);
  });

  it('una foto la abren su dueña, la administradora y las mentoras de sus clases', async () => {
    const key = `avatares/${w.sofia.id}/foto.png`;
    const status = async (actor: Parameters<typeof actAs>[0]) => {
      actAs(actor);
      return (await read(await get(key))).status;
    };
    expect(await status(w.sofia)).toBe(200);
    expect(await status(w.admin)).toBe(200);
    expect(await status(w.carolina)).toBe(200);
    expect(await status(w.valeria)).toBe(403);
    expect(await status(w.lucia)).toBe(403);
  });
});
