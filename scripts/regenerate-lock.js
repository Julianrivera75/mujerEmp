/*
 * Regenera package-lock.json dentro de un contenedor Linux con Node 22.
 * Usarlo después de cambiar dependencias desde Windows: npm allí omite paquetes opcionales de Linux
 * y luego "npm ci" falla en el CI y en Railway.
 *
 *   npm run lock
 */
const { execFileSync } = require('child_process');

execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${process.cwd()}:/app`,
    '-w',
    '/app',
    'node:22',
    'npm',
    'install',
    '--package-lock-only',
    '--ignore-scripts',
  ],
  { stdio: 'inherit' },
);
