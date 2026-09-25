import type { Role, UserStatus } from '@prisma/client';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import prisma from './prisma';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está configurado');
  }
  return new TextEncoder().encode('dev-only-secret-no-usar-en-produccion');
}

const JWT_SECRET = getJwtSecret();
const TOKEN_NAME = 'empoderas_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 días

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
  status: UserStatus;
}

/** `tokenVersion` (claim `tv`) permite revocar de golpe todas las sesiones de una cuenta. */
export async function signToken(payload: TokenPayload, tokenVersion: number): Promise<string> {
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
  const token = cookies().get(TOKEN_NAME)?.value;
  if (!token) return null;

  const claims = await readClaims(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, email: true, role: true, name: true, status: true, tokenVersion: true },
  });

  if (!user || user.status === 'INACTIVO' || user.tokenVersion !== claims.tv) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    status: user.status,
  };
}

export function setSessionCookie(token: string) {
  cookies().set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie() {
  cookies().delete(TOKEN_NAME);
}
