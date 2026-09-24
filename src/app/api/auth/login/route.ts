import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setSessionCookie } from '@/lib/auth';
import { getClientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { PASSWORD_MAX_LENGTH } from '@/lib/validators';
import { logError } from '@/lib/log';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_ACCOUNT = 5;
const MAX_ATTEMPTS_PER_IP = 30;

// Hash de relleno para ejecutar bcrypt aunque el correo no exista y no delatar qué cuentas existen por el tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync('relleno-para-igualar-tiempos', 10);

const INVALID_CREDENTIALS = 'Credenciales inválidas. Verifica tu correo y contraseña.';

function tooManyAttempts(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`login:ip:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS);
    if (!ipLimit.ok) return tooManyAttempts(ipLimit.retryAfterSec);

    let body: { email?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }

    const { email, password } = body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Por favor, ingresa correo y contraseña.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase().slice(0, 254);
    const accountKey = `login:${normalizedEmail}:${ip}`;
    const accountLimit = rateLimit(accountKey, MAX_ATTEMPTS_PER_ACCOUNT, WINDOW_MS);
    if (!accountLimit.ok) return tooManyAttempts(accountLimit.retryAfterSec);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Siempre se ejecuta bcrypt: mismo trabajo y misma respuesta exista o no la cuenta.
    const candidate = password.length <= PASSWORD_MAX_LENGTH ? password : password.slice(0, PASSWORD_MAX_LENGTH);
    const isMatch = await bcrypt.compare(candidate, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !isMatch || password.length > PASSWORD_MAX_LENGTH) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // Solo después de comprobar la contraseña se informa el estado de la cuenta, para no revelarlo a terceros.
    if (user.status === 'INACTIVO') {
      return NextResponse.json(
        {
          error: 'Tu cuenta se encuentra inactiva. Comunícate con la administración de Empoderas Diversas para reactivar tu acceso.',
          inactive: true,
        },
        { status: 403 },
      );
    }

    const now = new Date();
    if (user.startDate && new Date(user.startDate) > now) {
      return NextResponse.json(
        { error: `Tu periodo de formación inicia el ${new Date(user.startDate).toLocaleDateString('es-ES')}. Aún no tienes acceso habilitado.` },
        { status: 403 },
      );
    }

    if (user.endDate && new Date(user.endDate) < now) {
      return NextResponse.json(
        { error: `Tu periodo de vinculación finalizó el ${new Date(user.endDate).toLocaleDateString('es-ES')}. Contacta a la administración.` },
        { status: 403 },
      );
    }

    resetRateLimit(accountKey);

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'MENTOR' | 'STUDENT',
      status: user.status as 'ACTIVO' | 'INACTIVO',
    });

    setSessionCookie(token);

    let redirectUrl = '/estudiante';
    if (user.role === 'ADMIN') redirectUrl = '/admin';
    if (user.role === 'MENTOR') redirectUrl = '/mentor';

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      redirectUrl,
    });
  } catch (error) {
    logError('auth/login', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' }, { status: 500 });
  }
}
