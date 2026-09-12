import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from './prisma';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está configurado');
  }
  return 'dev-only-secret-no-usar-en-produccion';
}

const JWT_SECRET = getJwtSecret();
const TOKEN_NAME = 'empoderas_session';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  name: string;
  status: 'ACTIVO' | 'INACTIVO';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Verificar en base de datos si el usuario sigue existiendo y si sigue ACTIVO
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, role: true, name: true, status: true }
  });

  if (!user || user.status === 'INACTIVO') {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as 'ADMIN' | 'MENTOR' | 'STUDENT',
    name: user.name,
    status: user.status as 'ACTIVO' | 'INACTIVO',
  };
}

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TOKEN_NAME);
}
