/*
 * Importa usuarias desde un archivo JSON: [{ "name", "email", "documentId", "phone", "role" }] (role: STUDENT o MENTOR; por defecto STUDENT).
 *
 * Por defecto solo simula (no escribe nada). Con --apply crea las cuentas con contraseñas temporales
 * y guarda las credenciales en un CSV dentro de datos-privados/ (carpeta ignorada por git).
 *
 * Los mensajes van a stderr. Con --csv-stdout, las credenciales salen por stdout (para redirigirlas a un archivo
 * local sin mostrarlas), y no se escribe ningún archivo en el servidor.
 *
 * Contra la base real (que solo es accesible desde la red interna de Railway) se ejecuta dentro del servicio:
 *   railway ssh --service app -- node scripts/import-users.js /tmp/usuarios.json --apply --csv-stdout > credenciales.csv
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function tempPassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['STUDENT', 'MENTOR'];

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!file) {
    console.error('Uso: node scripts/import-users.js <archivo.json> [--apply]');
    process.exit(1);
  }

  const people = JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('No hay DATABASE_URL ni DATABASE_PUBLIC_URL.');
  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    const existing = await prisma.user.findMany({ select: { email: true, documentId: true } });
    const emails = new Set(existing.map((u) => u.email.toLowerCase()));
    const documents = new Set(existing.map((u) => u.documentId).filter(Boolean));

    const toCreate = [];
    const skipped = [];
    const seenEmails = new Set();
    const seenDocuments = new Set();

    for (const [index, person] of people.entries()) {
      const row = index + 1;
      const email = String(person.email ?? '')
        .trim()
        .toLowerCase();
      const name = String(person.name ?? '').trim();
      const documentId = String(person.documentId ?? '').trim();
      const role = person.role ?? 'STUDENT';

      if (!name || !EMAIL.test(email) || !ROLES.includes(role)) {
        skipped.push({ fila: row, motivo: 'nombre, correo o rol inválido' });
      } else if (emails.has(email) || seenEmails.has(email)) {
        skipped.push({ fila: row, motivo: 'el correo ya existe' });
      } else if (documentId && (documents.has(documentId) || seenDocuments.has(documentId))) {
        skipped.push({ fila: row, motivo: 'el documento ya existe' });
      } else {
        seenEmails.add(email);
        if (documentId) seenDocuments.add(documentId);
        toCreate.push({
          role,
          name,
          email,
          documentId: documentId || null,
          phone: String(person.phone ?? '').trim() || null,
        });
      }
    }

    console.error(`Personas en el archivo: ${people.length}`);
    console.error(`Se crearían: ${toCreate.length}`);
    console.error(`Se omiten: ${skipped.length}`);
    if (skipped.length > 0) console.error(JSON.stringify(skipped));

    if (!apply) {
      console.error('\nSimulación: no se escribió nada. Repite con --apply para crear las cuentas.');
      return;
    }

    const credentials = [];
    for (const person of toCreate) {
      const password = tempPassword();
      await prisma.user.create({
        data: {
          name: person.name,
          email: person.email,
          documentId: person.documentId,
          phone: person.phone,
          role: person.role,
          status: 'ACTIVO',
          passwordHash: await bcrypt.hash(password, 12),
        },
      });
      credentials.push({ nombre: person.name, correo: person.email, contrasena_temporal: password });
    }

    const rows = credentials.map((c) => `"${c.nombre}",${c.correo},${c.contrasena_temporal}`);
    const csv = ['﻿nombre,correo,contrasena_temporal', ...rows].join('\n') + '\n';

    if (process.argv.includes('--csv-stdout')) {
      process.stdout.write(csv);
      console.error(`\nCuentas creadas: ${credentials.length}. Credenciales enviadas a stdout.`);
    } else {
      const outDir = path.join(__dirname, '..', 'datos-privados');
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `credenciales-${new Date().toISOString().slice(0, 10)}.csv`);
      fs.writeFileSync(outFile, csv, { mode: 0o600 });
      console.error(`\nCuentas creadas: ${credentials.length}. Credenciales guardadas en: ${outFile}`);
    }
    console.error('Entrega cada contraseña de forma privada y pide que la cambien en Mi perfil.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo completar la importación:', error.message);
  process.exit(1);
});
