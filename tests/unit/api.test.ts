import { Prisma } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { HttpError, handleError, parseBody, parseValue, withAuth, withErrors } from '@/lib/api';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createUserSchema, updateClassSchema } from '@/lib/schemas';

afterEach(() => {
  vi.restoreAllMocks();
});

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('fallo', { code, clientVersion: 'test' });

describe('handleError', () => {
  it('respeta el código, los encabezados y los campos extra de un HttpError', async () => {
    const res = handleError('x', new HttpError(429, 'Espera', { 'Retry-After': '30' }, { inactive: true }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(await res.json()).toEqual({ error: 'Espera', inactive: true });
  });

  it('traduce los errores conocidos de la base de datos', () => {
    expect(handleError('x', prismaError('P2002')).status).toBe(409);
    expect(handleError('x', prismaError('P2025')).status).toBe(404);
  });

  it('un error inesperado devuelve 500 genérico y no filtra el detalle', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = handleError('x', new Error('contraseña de la base: secreto123'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secreto123');
    expect(spy).toHaveBeenCalled();
  });
});

describe('withAuth', () => {
  const ok = async () => Response.json({ ok: true });

  it('exige sesión y comprueba el rol', async () => {
    const route = withAuth('prueba', ['ADMIN'], ok);
    actAs(null);
    expect((await route(request('/x'))).status).toBe(401);
    actAs({ id: '1', email: 'a@b.co', name: 'A', role: 'STUDENT' });
    expect((await route(request('/x'))).status).toBe(403);
    actAs({ id: '1', email: 'a@b.co', name: 'A', role: 'ADMIN' });
    expect((await route(request('/x'))).status).toBe(200);
  });

  it("'any' acepta a cualquier persona con sesión y convierte los errores del manejador", async () => {
    const route = withAuth('prueba', 'any', async () => {
      throw new HttpError(418, 'Soy una tetera');
    });
    actAs({ id: '1', email: 'a@b.co', name: 'A', role: 'STUDENT' });
    const res = await read(await route(request('/x')));
    expect(res.status).toBe(418);
    expect(res.body.error).toBe('Soy una tetera');
  });
});

describe('withErrors', () => {
  it('traduce errores en rutas públicas', async () => {
    const route = withErrors('prueba', async () => {
      throw prismaError('P2002');
    });
    expect((await route(request('/x'))).status).toBe(409);
  });
});

describe('parseBody y parseValue', () => {
  const schema = z.object({ n: z.number({ error: 'n debe ser un número.' }) });

  it('devuelve los datos válidos', async () => {
    expect(await parseBody(request('/x', { method: 'POST', body: { n: 3 } }), schema)).toEqual({ n: 3 });
  });

  it('un JSON roto o inválido produce un 400 con el primer problema', async () => {
    await expect(parseBody(new Request('http://x', { method: 'POST', body: '{roto' }), schema)).rejects.toMatchObject({
      status: 400,
    });
    await expect(parseBody(request('/x', { method: 'POST', body: { n: 'a' } }), schema)).rejects.toMatchObject({
      status: 400,
      message: 'n debe ser un número.',
    });
    expect(() => parseValue(schema, {})).toThrow(HttpError);
  });
});

describe('esquemas', () => {
  it('createUserSchema normaliza el correo y limpia los textos opcionales', () => {
    const parsed = createUserSchema.parse({
      name: '  Ana  ',
      email: ' ANA@Prueba.TEST ',
      password: 'una-clave-larga-1',
      role: 'STUDENT',
      studentNumber: '  ',
      phone: ' +1 305 555 0123 ',
    });
    expect(parsed).toMatchObject({
      name: 'Ana',
      email: 'ana@prueba.test',
      studentNumber: null,
      phone: '+1 305 555 0123',
    });
  });

  it('createUserSchema rechaza roles, estados y contraseñas inválidos', () => {
    const base = { name: 'Ana', email: 'a@b.co', password: 'una-clave-larga-1', role: 'STUDENT' };
    expect(createUserSchema.safeParse({ ...base, role: 'ROOT' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, password: '123' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, status: 'X' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, email: 'roto' }).success).toBe(false);
  });

  it('updateClassSchema acepta campos ausentes para conservar los actuales', () => {
    expect(updateClassSchema.parse({ id: 'c1' })).toEqual({ id: 'c1' });
    expect(updateClassSchema.safeParse({}).success).toBe(false);
  });
});

describe('número de contacto', () => {
  const base = { name: 'Ana', email: 'a@b.co', password: 'una-clave-larga-1', role: 'STUDENT' };

  it('acepta formatos internacionales y rechaza texto que no es un teléfono', () => {
    for (const phone of ['+57 300 000 0000', '3001234567', '+1 (305) 555-0123', '']) {
      expect(createUserSchema.safeParse({ ...base, phone }).success).toBe(true);
    }
    for (const phone of ['abc', '123', 'llamar mañana', '+++123']) {
      expect(createUserSchema.safeParse({ ...base, phone }).success).toBe(false);
    }
  });
});
