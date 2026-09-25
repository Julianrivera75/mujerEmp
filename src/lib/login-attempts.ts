import prisma from './prisma';

/**
 * Límite de intentos fallidos de inicio de sesión guardado en la base de datos:
 * sobrevive a los reinicios y funciona con varias réplicas del servicio.
 */

export interface AttemptStatus {
  blocked: boolean;
  retryAfterSec: number;
}

/** Indica si la clave ya alcanzó el máximo de intentos dentro de la ventana. */
export async function checkAttempts(key: string, max: number, windowMs: number): Promise<AttemptStatus> {
  const since = new Date(Date.now() - windowMs);
  const recent = await prisma.loginAttempt.findMany({
    where: { key, createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    take: max,
    select: { createdAt: true },
  });
  if (recent.length < max) return { blocked: false, retryAfterSec: 0 };

  // Se libera cuando el intento más antiguo de la ventana sale de ella.
  const releaseAt = recent[0].createdAt.getTime() + windowMs;
  return { blocked: true, retryAfterSec: Math.max(1, Math.ceil((releaseAt - Date.now()) / 1000)) };
}

export async function recordAttempt(...keys: string[]) {
  await prisma.loginAttempt.createMany({ data: keys.map((key) => ({ key })) });
}

export async function clearAttempts(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

/** Elimina los intentos ya vencidos; se llama de forma ocasional para que la tabla no crezca. */
export async function purgeAttempts(windowMs: number) {
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - windowMs) } } });
}
