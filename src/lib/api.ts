import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { getCurrentUser, type TokenPayload } from '@/lib/auth';
import { logError } from '@/lib/log';

export type Role = TokenPayload['role'];

/** Error esperado con el código HTTP que debe recibir la cliente. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: Record<string, string>,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Respuesta de error. Convención de toda la API: los errores siempre llevan `{ error }`. */
function fail(status: number, message: string, headers?: Record<string, string>, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers });
}

/** Lee y valida el cuerpo JSON. Lanza HttpError 400 con el primer problema encontrado. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'Solicitud inválida.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Datos inválidos.');
  }
  return result.data;
}

/** Convierte cualquier error en una respuesta sin filtrar detalles internos. */
export function handleError(scope: string, error: unknown) {
  if (error instanceof HttpError) {
    return fail(error.status, error.message, error.headers, error.extra);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return fail(409, 'Ya existe un registro con esos datos.');
    if (error.code === 'P2025') return fail(404, 'Registro no encontrado.');
  }
  logError(scope, error);
  return fail(500, 'Ocurrió un error en el servidor. Intenta de nuevo.');
}

type Handler = (req: Request, user: TokenPayload) => Promise<Response>;

/**
 * Envuelve una ruta: exige sesión (401), comprueba el rol (403) y traduce los errores.
 * `roles: 'any'` acepta a cualquier persona con sesión.
 */
export function withAuth(scope: string, roles: readonly Role[] | 'any', handler: Handler) {
  return async (req: Request): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) return fail(401, 'No autorizado. Inicia sesión.');
      if (roles !== 'any' && !roles.includes(user.role)) return fail(403, 'Acceso denegado.');
      return await handler(req, user);
    } catch (error) {
      return handleError(scope, error);
    }
  };
}

/** Para rutas públicas (inicio de sesión, salud): solo traduce los errores. */
export function withErrors(scope: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      return handleError(scope, error);
    }
  };
}

/** Tope de filas por listado, para que ninguna respuesta crezca sin límite. */
export const MAX_ROWS = 500;

/** Valida un valor suelto (por ejemplo un campo opcional de la edición). Lanza HttpError 400. */
export function parseValue<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Datos inválidos.');
  }
  return result.data;
}
