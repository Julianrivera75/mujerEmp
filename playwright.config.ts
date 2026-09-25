import { defineConfig, devices } from '@playwright/test';

// Las pruebas de extremo a extremo apuntan a un despliegue (por ejemplo staging), no levantan el servidor.
//   E2E_BASE_URL=https://app-staging-ba45.up.railway.app npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
});
