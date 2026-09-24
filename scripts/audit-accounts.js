/*
 * Auditoría de solo lectura: lista las cuentas cuya contraseña coincide con una lista de contraseñas
 * comunes o de prueba. No modifica nada. Ejecutar contra la base real con el CLI de Railway:
 *
 *   railway run node scripts/audit-accounts.js
 *
 * Después, cambiar las contraseñas de las cuentas que aparezcan desde Usuarios en el panel de administración.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const WEAK_PASSWORDS = ['123456', '1234567', '12345678', '123456789', 'password', 'contraseña', 'empoderas', 'empoderas123', 'qwerty123'];

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { anonymizedAt: null },
      select: { id: true, email: true, role: true, status: true, passwordHash: true },
    });

    const findings = [];
    for (const user of users) {
      for (const candidate of WEAK_PASSWORDS) {
        if (await bcrypt.compare(candidate, user.passwordHash)) {
          findings.push({ email: user.email, role: user.role, status: user.status, weakPassword: candidate });
          break;
        }
      }
    }

    console.log(`Cuentas revisadas: ${users.length}`);
    if (findings.length === 0) {
      console.log('Ninguna cuenta usa una contraseña de la lista.');
    } else {
      console.log(`Cuentas con contraseña débil: ${findings.length}`);
      console.table(findings);
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo completar la auditoría:', error.message);
  process.exit(1);
});
