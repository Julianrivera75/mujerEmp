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
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  name: string;
  status: 'ACTIVO' | 'INACTIVO';
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(JWT_SECRET);
}

async function readUserId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}

/** Usuaria de la sesión, con rol y estado tomados de la base de datos (no del token). */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = cookies().get(TOKEN_NAME)?.value;
  if (!token) return null;

  const id = await readUserId(token);
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, name: true, status: true },
  });

  if (!user || user.status === 'INACTIVO') {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as TokenPayload['role'],
    name: user.name,
    status: user.status as TokenPayload['status'],
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
