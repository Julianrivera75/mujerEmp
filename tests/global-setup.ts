import { execSync } from 'node:child_process';

/** Aplica las migraciones a la base de pruebas. Se niega a correr si la URL no parece de pruebas. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
  if (!url) {
    console.warn('Sin base de datos de pruebas: se omiten las pruebas de integración.');
    return;
  }
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error('La base de datos de pruebas debe tener "test" en su nombre. No se ejecuta contra otra base.');
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
