import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { HttpError, parseBody, withErrors } from '@/lib/api';
import { setSessionCookie, signToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkAttempts, clearAttempts, purgeAttempts, recordAttempt } from '@/lib/login-attempts';
import { formatDate } from '@/lib/format';
import { getClientIp } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/schemas';
import { PASSWORD_MAX_LENGTH } from '@/lib/validators';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_ACCOUNT = 5;
const MAX_ATTEMPTS_PER_IP = 30;

// Hash de relleno para ejecutar bcrypt aunque el correo no exista y no delatar qué cuentas existen por el tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync('relleno-para-igualar-tiempos', 10);

const INVALID_CREDENTIALS = 'Credenciales inválidas. Verifica tu correo y contraseña.';

function tooManyAttempts(retryAfterSec: number) {
  return new HttpError(429, 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.', {
    'Retry-After': String(retryAfterSec),
  });
}

export const POST = withErrors('auth/login', async (req) => {
  const ip = getClientIp(req);
  const ipKey = `login:ip:${ip}`;
  const ipLimit = await checkAttempts(ipKey, MAX_ATTEMPTS_PER_IP, WINDOW_MS);
  if (ipLimit.blocked) throw tooManyAttempts(ipLimit.retryAfterSec);

  const { email, password } = await parseBody(req, loginSchema);

  const normalizedEmail = email.trim().toLowerCase().slice(0, 254);
  const accountKey = `login:${normalizedEmail}:${ip}`;
  const accountLimit = await checkAttempts(accountKey, MAX_ATTEMPTS_PER_ACCOUNT, WINDOW_MS);
  if (accountLimit.blocked) throw tooManyAttempts(accountLimit.retryAfterSec);

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Siempre se ejecuta bcrypt: mismo trabajo y misma respuesta exista o no la cuenta.
  const candidate = password.slice(0, PASSWORD_MAX_LENGTH);
  const isMatch = await bcrypt.compare(candidate, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !isMatch || password.length > PASSWORD_MAX_LENGTH) {
    await recordAttempt(ipKey, accountKey);
    // Limpieza ocasional de intentos vencidos.
    if (Math.random() < 0.02) await purgeAttempts(WINDOW_MS).catch(() => undefined);
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  // Solo después de comprobar la contraseña se informa el estado de la cuenta, para no revelarlo a terceros.
  if (user.status === 'INACTIVO') {
    throw new HttpError(
      403,
      'Tu cuenta se encuentra inactiva. Comunícate con la administración de Empoderas Diversas para reactivar tu acceso.',
      undefined,
      { inactive: true },
    );
  }

  const now = new Date();
  if (user.startDate && user.startDate > now) {
    throw new HttpError(
      403,
      `Tu periodo de formación inicia el ${formatDate(user.startDate)}. Aún no tienes acceso habilitado.`,
    );
  }
  if (user.endDate && user.endDate < now) {
    throw new HttpError(
      403,
      `Tu periodo de vinculación finalizó el ${formatDate(user.endDate)}. Contacta a la administración.`,
    );
  }

  await clearAttempts(accountKey);

  const token = await signToken(
    { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
    user.tokenVersion,
  );
  setSessionCookie(token);

  const redirectUrl = user.role === 'ADMIN' ? '/admin' : user.role === 'MENTOR' ? '/mentor' : '/estudiante';

  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    redirectUrl,
  });
});
