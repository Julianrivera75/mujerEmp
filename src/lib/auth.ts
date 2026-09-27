import type { Role, UserStatus } from '@prisma/client';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import prisma from './prisma';
import { rolesOf } from './roles';
import { SESSION_COOKIE, VIEW_COOKIE } from './session-cookie';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está configurado');
  }
  return new TextEncoder().encode('dev-only-secret-no-usar-en-produccion');
}

const JWT_SECRET = getJwtSecret();
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 días

export interface TokenPayload {
  id: string;
  email: string;
  /** Rol de la vista activa. */
  role: Role;
  /** Todos los roles de la cuenta. */
  roles: Role[];
  name: string;
  status: UserStatus;
}

/** `tokenVersion` (claim `tv`) permite revocar de golpe todas las sesiones de una cuenta. */
export async function signToken(payload: Omit<TokenPayload, 'roles'>, tokenVersion: number): Promise<string> {
  return new SignJWT({ ...payload, tv: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(JWT_SECRET);
}

async function readClaims(token: string): Promise<{ id: string; tv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload.id !== 'string') return null;
    // Los tokens emitidos antes de existir la revocación no traen `tv` y equivalen a la versión 0.
    return { id: payload.id, tv: typeof payload.tv === 'number' ? payload.tv : 0 };
  } catch {
    return null;
  }
}

/** Usuaria de la sesión, con rol y estado tomados de la base de datos (no del token). */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await readClaims(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, email: true, role: true, extraRoles: true, name: true, status: true, tokenVersion: true },
  });

  if (!user || user.status === 'INACTIVO' || user.tokenVersion !== claims.tv) {
    return null;
  }

  // La vista activa solo se acepta si la cuenta realmente tiene ese rol.
  const roles = rolesOf(user);
  const requested = (await cookies()).get(VIEW_COOKIE)?.value;
  const role = roles.find((r) => r === requested) ?? user.role;

  return { id: user.id, email: user.email, role, roles, name: user.name, status: user.status };
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
}

/** Fija la vista activa (rol con el que se usa la plataforma). */
export async function setViewCookie(role: Role) {
  (await cookies()).set(VIEW_COOKIE, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(VIEW_COOKIE);
}
