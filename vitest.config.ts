import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Las pruebas de integración usan una base propia (ver docker-compose.test.yml).
// TEST_DATABASE_URL tiene prioridad; en CI se usa DATABASE_URL, que apunta al servicio de Postgres del workflow.
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: { DATABASE_URL: databaseUrl, JWT_SECRET: 'secreto-solo-para-pruebas' },
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['src/lib/cn.ts', 'src/lib/motion.ts', 'src/lib/roles.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 80 },
    },
  },
});
