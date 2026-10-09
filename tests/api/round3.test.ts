import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteAssignment, PUT as putAssignment } from '@/app/api/assignments/route';
import { PUT as putUser, POST as postUser } from '@/app/api/admin/users/route';
import { POST as credentials } from '@/app/api/admin/users/credentials/route';
import { GET as me } from '@/app/api/auth/me/route';
import { PUT as profile } from '@/app/api/auth/profile/route';
import { GET as classes } from '@/app/api/classes/route';
import {
  DELETE as deleteSubmission,
  POST as postSubmission,
  PUT as gradeSubmission,
} from '@/app/api/submissions/route';
import prisma from '@/lib/prisma';
import { deleteObject } from '@/lib/s3';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, PASSWORD, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const send = (handler: (req: Request) => Promise<Response>, method: string, path: string, body?: unknown) =>
  handler(request(path, { method, body: body as Record<string, unknown> | undefined }));

describe('cambio obligatorio de contraseña', () => {
  it('la administración marca la cuenta al crearla, editarla con contraseña o restablecerla', async () => {
    actAs(w.admin);
    const created = await read(
      await send(postUser, 'POST', '/api/admin/users', {
        name: 'Nueva',
        email: 'nueva@prueba.test',
        password: 'clave-inicial-123',
        role: 'STUDENT',
      }),
    );
    expect(created.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: 'nueva@prueba.test' } })).mustChangePassword).toBe(
      true,
    );

    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).mustChangePassword).toBe(false);
    await send(putUser, 'PUT', '/api/admin/users', { id: w.sofia.id, password: 'otra-clave-larga-1' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).mustChangePassword).toBe(true);

    await send(putUser, 'PUT', '/api/admin/users', { id: w.lucia.id, phone: '+1 305 555 0000' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.lucia.id } })).mustChangePassword).toBe(false);

    await send(credentials, 'POST', '/api/admin/users/credentials', { ids: [w.carolina.id] });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.carolina.id } })).mustChangePassword).toBe(true);
  });

  it('mientras esté pendiente, la API rechaza todo salvo el perfil y me', async () => {
    actAs({ ...w.sofia, mustChangePassword: true });
    const blocked = await read(await classes(request('/api/classes')));
    expect(blocked.status).toBe(403);
    expect(blocked.body.mustChangePassword).toBe(true);

    expect((await me(request('/api/auth/me'))).status).toBe(200);
  });

  it('al cambiar la contraseña la bandera se limpia y no vuelve', async () => {
    await prisma.user.update({ where: { id: w.sofia.id }, data: { mustChangePassword: true } });
    actAs({ ...w.sofia, mustChangePassword: true });

    const same = await read(
      await send(profile, 'PUT', '/api/auth/profile', { currentPassword: PASSWORD, newPassword: PASSWORD }),
    );
    expect(same.status).toBe(400);
    const weak = await read(
      await send(profile, 'PUT', '/api/auth/profile', { currentPassword: PASSWORD, newPassword: '123' }),
    );
    expect(weak.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).mustChangePassword).toBe(true);

    const ok = await read(
      await send(profile, 'PUT', '/api/auth/profile', {
        currentPassword: PASSWORD,
        newPassword: 'mi-clave-nueva-2026',
      }),
    );
    expect(ok.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.mustChangePassword).toBe(false);
    expect(await bcrypt.compare('mi-clave-nueva-2026', saved.passwordHash)).toBe(true);
  });
});

describe('editar el perfil', () => {
  it('cambia el nombre y el contacto sin pedir la contraseña', async () => {
    actAs(w.sofia);
    const res = await read(
      await send(profile, 'PUT', '/api/auth/profile', { name: '  Sofía Rojas  ', phone: '+57 300 111 2222' }),
    );
    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.name).toBe('Sofía Rojas');
    expect(saved.phone).toBe('+57 300 111 2222');
    expect((await send(profile, 'PUT', '/api/auth/profile', { name: '   ' })).status).toBe(400);
  });

  it('cambiar el correo exige la contraseña actual y que no esté en uso', async () => {
    actAs(w.sofia);
    const sinClave = await read(await send(profile, 'PUT', '/api/auth/profile', { email: 'nuevo@prueba.test' }));
    expect(sinClave.status).toBe(400);
    const mala = await read(
      await send(profile, 'PUT', '/api/auth/profile', { email: 'nuevo@prueba.test', currentPassword: 'incorrecta-1' }),
    );
    expect(mala.status).toBe(400);
    const repetido = await read(
      await send(profile, 'PUT', '/api/auth/profile', { email: 'LUCIA@prueba.test', currentPassword: PASSWORD }),
    );
    expect(repetido.status).toBe(409);
    const ok = await read(
      await send(profile, 'PUT', '/api/auth/profile', { email: ' Nuevo@Prueba.test ', currentPassword: PASSWORD }),
    );
    expect(ok.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).email).toBe('nuevo@prueba.test');
  });

  it('permite cambiar el número propio pero no el rol ni el estado', async () => {
    actAs(w.sofia);
    await send(profile, 'PUT', '/api/auth/profile', { memberNumber: '999', role: 'ADMIN', status: 'INACTIVO' });
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.memberNumber).toBe('999');
    expect(saved.role).toBe('STUDENT');
    expect(saved.status).toBe('ACTIVO');
  });
});

describe('tareas: la mentora edita y elimina', () => {
  const edit = (body: Record<string, unknown>) => send(putAssignment, 'PUT', '/api/assignments', body);
  const remove = (id: string) => deleteAssignment(request(`/api/assignments?id=${id}`, { method: 'DELETE' }));
  const valid = () => ({
    title: 'Título corregido',
    description: 'Nueva descripción',
    dueDate: new Date(Date.now() + 9 * 86400000).toISOString(),
  });

  it('solo la mentora de la clase o la administración editan', async () => {
    actAs(w.carolina);
    expect((await read(await edit({ id: w.tarea.id, ...valid() }))).status).toBe(200);
    expect((await prisma.assignment.findUniqueOrThrow({ where: { id: w.tarea.id } })).title).toBe('Título corregido');

    actAs(w.valeria);
    expect((await edit({ id: w.tarea.id, ...valid() })).status).toBe(403);
    actAs(w.sofia);
    expect((await edit({ id: w.tarea.id, ...valid() })).status).toBe(403);
    actAs(w.admin);
    expect((await edit({ id: w.tarea.id, ...valid() })).status).toBe(200);
    expect((await edit({ id: 'no-existe', ...valid() })).status).toBe(404);
    expect((await edit({ id: w.tarea.id, title: '', description: 'x', dueDate: 'no-es-fecha' })).status).toBe(400);
  });

  it('la administración puede eliminar cualquier tarea y se borran también los avisos que generó', async () => {
    await prisma.notification.createMany({
      data: [
        {
          userId: w.sofia.id,
          type: 'NEW_ASSIGNMENT',
          title: 'Nueva tarea',
          body: 'Ensayo',
          href: `/estudiante/tareas?tarea=${w.tarea.id}`,
          dedupeKey: `new:${w.tarea.id}`,
        },
        {
          userId: w.carolina.id,
          type: 'SUBMISSION_RECEIVED',
          title: 'Entrega recibida',
          body: 'Ensayo',
          href: `/mentor/tareas?tarea=${w.tarea.id}`,
          dedupeKey: `sub:${w.entrega.id}:1`,
        },
        {
          userId: w.sofia.id,
          type: 'NEW_ASSIGNMENT',
          title: 'Otra tarea',
          body: 'Sin relación',
          href: '/estudiante/tareas?tarea=otra-tarea',
          dedupeKey: 'new:otra-tarea',
        },
      ],
    });

    // La tarea es de la clase de Carolina: una administradora que no la creó puede borrarla.
    actAs(w.admin);
    expect((await read(await remove(w.tarea.id))).status).toBe(200);
    expect(await prisma.assignment.count({ where: { id: w.tarea.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { href: { contains: w.tarea.id } } })).toBe(0);
    // Los avisos de otras tareas no se tocan.
    expect(await prisma.notification.count()).toBe(1);
  });

  it('eliminar borra la tarea, sus entregas y los archivos subidos', async () => {
    await prisma.submission.update({
      where: { id: w.entrega.id },
      data: { fileType: 'PDF', fileUrl: `entregas/${w.sofia.id}/informe.pdf` },
    });

    actAs(w.valeria);
    expect((await remove(w.tarea.id)).status).toBe(403);

    actAs(w.carolina);
    const res = await read(await remove(w.tarea.id));
    expect(res.status).toBe(200);
    expect(res.body.deletedSubmissions).toBe(1);
    expect(await prisma.assignment.count({ where: { id: w.tarea.id } })).toBe(0);
    expect(await prisma.submission.count({ where: { assignmentId: w.tarea.id } })).toBe(0);
    expect(deleteObject).toHaveBeenCalledWith(`entregas/${w.sofia.id}/informe.pdf`);
    expect((await remove(w.tarea.id)).status).toBe(404);
  });
});

describe('entregas: la estudiante edita y quita', () => {
  const submit = (body: Record<string, unknown>) => send(postSubmission, 'POST', '/api/submissions', body);
  const remove = (assignmentId: string) =>
    deleteSubmission(request(`/api/submissions?assignmentId=${assignmentId}`, { method: 'DELETE' }));

  it('quitar la entrega deja la tarea como si no se hubiera entregado y borra el archivo', async () => {
    const key = `entregas/${w.sofia.id}/foto.jpg`;
    await prisma.submission.update({ where: { id: w.entrega.id }, data: { fileType: 'IMAGE', fileUrl: key } });

    actAs(w.sofia);
    expect((await read(await remove(w.tarea.id))).status).toBe(200);
    expect(await prisma.submission.count({ where: { assignmentId: w.tarea.id, studentId: w.sofia.id } })).toBe(0);
    expect(deleteObject).toHaveBeenCalledWith(key);

    // vuelve a poder entregar
    expect(
      (
        await read(
          await submit({
            assignmentId: w.tarea.id,
            notes: 'Otra vez',
            fileType: 'LINK',
            fileUrl: 'https://ejemplo.com/trabajo',
          }),
        )
      ).status,
    ).toBe(200);
    expect((await remove(w.tarea.id)).status).toBe(200);
    expect((await remove(w.tarea.id)).status).toBe(404);
  });

  it('solo la dueña puede quitarla y las demás personas reciben 403', async () => {
    for (const actor of [w.carolina, w.admin]) {
      actAs(actor);
      expect((await remove(w.tarea.id)).status).toBe(403);
    }
    actAs(null);
    expect((await remove(w.tarea.id)).status).toBe(401);
    actAs(w.lucia);
    expect((await remove(w.tarea.id)).status).toBe(404); // no entregó
  });

  it('una entrega calificada queda bloqueada hasta que la mentora quite la nota', async () => {
    actAs(w.carolina);
    await send(gradeSubmission, 'PUT', '/api/submissions', { submissionId: w.entrega.id, grade: 4 });

    actAs(w.sofia);
    expect((await read(await remove(w.tarea.id))).status).toBe(409);
    expect(
      (
        await read(
          await submit({
            assignmentId: w.tarea.id,
            notes: 'Cambio',
            fileType: 'LINK',
            fileUrl: 'https://ejemplo.com/trabajo',
          }),
        )
      ).status,
    ).toBe(409);

    actAs(w.carolina);
    await send(gradeSubmission, 'PUT', '/api/submissions', { submissionId: w.entrega.id, grade: '' });
    actAs(w.sofia);
    expect(
      (
        await read(
          await submit({
            assignmentId: w.tarea.id,
            notes: 'Cambio',
            fileType: 'LINK',
            fileUrl: 'https://ejemplo.com/trabajo',
          }),
        )
      ).status,
    ).toBe(200);
  });

  it('al reemplazar un archivo subido, el anterior se elimina', async () => {
    const old = `entregas/${w.sofia.id}/viejo.pdf`;
    await prisma.submission.update({ where: { id: w.entrega.id }, data: { fileType: 'PDF', fileUrl: old } });
    actAs(w.sofia);
    const res = await read(
      await submit({
        assignmentId: w.tarea.id,
        notes: 'x',
        fileType: 'PDF',
        fileUrl: `entregas/${w.sofia.id}/nuevo.pdf`,
      }),
    );
    expect(res.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(old);
  });
});
