import { beforeEach, describe, expect, it } from 'vitest';
import { GET, POST, PUT } from '@/app/api/admin/users/route';
import { POST as anonymize } from '@/app/api/admin/users/anonymize/route';
import { POST as toggleStatus } from '@/app/api/admin/users/toggle-status/route';
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

const create = (body: Record<string, unknown>) => POST(request('/api/admin/users', { method: 'POST', body }));
const update = (body: Record<string, unknown>) => PUT(request('/api/admin/users', { method: 'PUT', body }));

const newUser = (override: Record<string, unknown> = {}) => ({
  name: 'Persona Nueva',
  email: 'nueva@prueba.test',
  password: 'una-clave-larga-1',
  role: 'STUDENT',
  ...override,
});

describe('acceso a la administración de usuarias', () => {
  it('solo la administradora entra', async () => {
    for (const actor of [null, w.sofia, w.carolina]) {
      actAs(actor);
      const denied = actor ? 403 : 401;
      expect((await read(await GET(request('/api/admin/users')))).status).toBe(denied);
      expect((await read(await create(newUser()))).status).toBe(denied);
      expect((await read(await update({ id: w.sofia.id, role: 'ADMIN' }))).status).toBe(denied);
      expect(
        (
          await read(
            await toggleStatus(request('/x', { method: 'POST', body: { id: w.sofia.id, status: 'INACTIVO' } })),
          )
        ).status,
      ).toBe(denied);
      expect((await read(await anonymize(request('/x', { method: 'POST', body: { id: w.sofia.id } })))).status).toBe(
        denied,
      );
    }
  });
});

describe('GET /api/admin/users', () => {
  it('lista usuarias sin exponer contraseñas', async () => {
    actAs(w.admin);
    const res = await read(await GET(request('/api/admin/users')));
    expect(res.body.users).toHaveLength(5);
    expect(res.raw).not.toContain('passwordHash');
    expect(res.raw).not.toContain('$2');
  });

  it('filtra por rol y por estado, y omite filtros inválidos', async () => {
    actAs(w.admin);
    const mentors = await read(await GET(request('/api/admin/users?role=MENTOR')));
    expect(mentors.body.users).toHaveLength(2);
    const invalid = await read(await GET(request('/api/admin/users?role=HACKER')));
    expect(invalid.body.users).toHaveLength(5);
  });
});

describe('POST /api/admin/users', () => {
  it.each([
    ['contraseña corta', { password: 'abc' }],
    ['contraseña común', { password: '12345678' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['rol inválido', { role: 'SUPERADMIN' }],
    ['estado inválido', { status: 'BORRADO' }],
    ['sin nombre', { name: '  ' }],
  ])('rechaza %s', async (_name, override) => {
    actAs(w.admin);
    expect((await read(await create(newUser(override)))).status).toBe(400);
  });

  it('rechaza un correo repetido sin distinguir mayúsculas', async () => {
    actAs(w.admin);
    expect((await read(await create(newUser({ email: 'SOFIA@prueba.test' })))).status).toBe(409);
  });

  it('crea la cuenta con contraseña cifrada y devuelve solo campos seguros', async () => {
    actAs(w.admin);
    const res = await read(await create(newUser()));
    expect(res.status).toBe(200);
    expect(res.raw).not.toContain('passwordHash');
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: 'nueva@prueba.test' } });
    expect(saved.passwordHash).not.toContain('una-clave-larga-1');
    expect(saved.passwordHash.startsWith('$2')).toBe(true);
    expect(saved.status).toBe('ACTIVO');
  });

  it('una persona menor guarda a su representante; sin autorización no queda registrada', async () => {
    actAs(w.admin);
    await create(newUser({ isMinor: true, guardianName: 'Madre', guardianContact: '300', guardianConsent: true }));
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: 'nueva@prueba.test' } });
    expect(saved.isMinor).toBe(true);
    expect(saved.guardianName).toBe('Madre');
    expect(saved.guardianConsentAt).not.toBeNull();

    await create(newUser({ email: 'otra@prueba.test', isMinor: true, guardianName: 'Padre' }));
    const other = await prisma.user.findUniqueOrThrow({ where: { email: 'otra@prueba.test' } });
    expect(other.guardianConsentAt).toBeNull();
  });
});

describe('PUT /api/admin/users', () => {
  it('no devuelve el hash de la contraseña', async () => {
    actAs(w.admin);
    const res = await read(await update({ id: w.sofia.id, name: 'Sofia Editada' }));
    expect(res.status).toBe(200);
    expect(res.raw).not.toContain('passwordHash');
    expect(res.body.user.name).toBe('Sofia Editada');
  });

  it('valida rol, estado y correo', async () => {
    actAs(w.admin);
    expect((await read(await update({ id: w.sofia.id, role: 'DIOS' }))).status).toBe(400);
    expect((await read(await update({ id: w.sofia.id, status: 'X' }))).status).toBe(400);
    expect((await read(await update({ id: w.sofia.id, email: 'roto' }))).status).toBe(400);
  });

  it('rechaza un correo ya usado y una cuenta inexistente', async () => {
    actAs(w.admin);
    expect((await read(await update({ id: w.sofia.id, email: 'lucia@prueba.test' }))).status).toBe(409);
    expect((await read(await update({ id: 'no-existe' }))).status).toBe(404);
    expect((await read(await update({}))).status).toBe(400);
  });

  it('una administradora no puede quitarse a sí misma el acceso', async () => {
    actAs(w.admin);
    expect((await read(await update({ id: w.admin.id, role: 'MENTOR' }))).status).toBe(400);
    expect((await read(await update({ id: w.admin.id, status: 'INACTIVO' }))).status).toBe(400);
    expect((await read(await update({ id: w.admin.id, name: 'Admin Renombrada' }))).status).toBe(200);
  });

  it('cambia la contraseña solo si cumple la política', async () => {
    actAs(w.admin);
    expect((await read(await update({ id: w.sofia.id, password: '123' }))).status).toBe(400);
    const before = (await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).passwordHash;
    expect((await read(await update({ id: w.sofia.id, password: 'otra-clave-larga-9' }))).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).passwordHash).not.toBe(before);
  });

  it('un menor sin persona menor limpia los datos del representante', async () => {
    actAs(w.admin);
    await update({ id: w.sofia.id, isMinor: true, guardianName: 'Madre', guardianConsent: true });
    await update({ id: w.sofia.id, isMinor: false });
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.guardianName).toBeNull();
    expect(saved.guardianConsentAt).toBeNull();
  });
});

describe('POST /api/admin/users/toggle-status', () => {
  const toggle = (body: Record<string, unknown>) => toggleStatus(request('/x', { method: 'POST', body }));

  it('valida datos, evita la autodesactivación y cambia el estado', async () => {
    actAs(w.admin);
    expect((await read(await toggle({ id: w.sofia.id, status: 'OTRO' }))).status).toBe(400);
    expect((await read(await toggle({ id: w.admin.id, status: 'INACTIVO' }))).status).toBe(400);
    expect((await read(await toggle({ id: 'no-existe', status: 'INACTIVO' }))).status).toBe(404);
    expect((await read(await toggle({ id: w.sofia.id, status: 'INACTIVO' }))).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).status).toBe('INACTIVO');
  });
});

describe('POST /api/admin/users/anonymize', () => {
  const run = (id: unknown) => anonymize(request('/x', { method: 'POST', body: { id } }));

  it('no permite anonimizarse a sí misma ni cuentas inexistentes', async () => {
    actAs(w.admin);
    expect((await read(await run(w.admin.id))).status).toBe(400);
    expect((await read(await run('no-existe'))).status).toBe(404);
    expect((await read(await run(undefined))).status).toBe(400);
  });

  it('elimina los datos personales, los archivos y bloquea la cuenta', async () => {
    await prisma.user.update({ where: { id: w.sofia.id }, data: { avatar: `avatares/${w.sofia.id}/foto.png` } });
    actAs(w.admin);
    const res = await read(await run(w.sofia.id));
    expect(res.status).toBe(200);

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } });
    expect(saved.name).toBe('Usuaria anonimizada');
    expect(saved.email).toBe(`anonimizada-${w.sofia.id}@anonimizada.invalid`);
    expect(saved.documentId).toBeNull();
    expect(saved.phone).toBeNull();
    expect(saved.avatar).toBeNull();
    expect(saved.status).toBe('INACTIVO');
    expect(saved.anonymizedAt).not.toBeNull();

    const submission = await prisma.submission.findUniqueOrThrow({ where: { id: w.entrega.id } });
    expect(submission.notes).toBeNull();
    expect(submission.fileUrl).toBeNull();
    expect(deleteObject).toHaveBeenCalledWith(`avatares/${w.sofia.id}/foto.png`);
    expect(deleteObject).toHaveBeenCalledWith(`entregas/${w.sofia.id}/ensayo.pdf`);
  });

  it('una cuenta anonimizada no se repite, no se edita y no se reactiva', async () => {
    actAs(w.admin);
    await run(w.sofia.id);
    expect((await read(await run(w.sofia.id))).status).toBe(409);
    expect((await read(await update({ id: w.sofia.id, name: 'Otra' }))).status).toBe(409);
    expect(
      (await read(await toggleStatus(request('/x', { method: 'POST', body: { id: w.sofia.id, status: 'ACTIVO' } }))))
        .status,
    ).toBe(409);
  });
});
