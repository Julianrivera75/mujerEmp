/*
 * Emisión puntual del certificado real de una estudiante EXENTA ("Madrina", certificateExempt=true)
 * para un módulo, por fuera del panel admin: hoy no hay botón en /admin/certificados que llame a
 * GET /api/admin/certificates/pdf (no hay UI para esta descarga de soporte todavía). Replica, en JS
 * plano sin depender del build de Next, exactamente la misma regla y el mismo registro que ese
 * endpoint usa (src/lib/certificate-issue.ts, certificate-verification.ts, certificate-pdf.ts,
 * modules.ts): el PDF y el código de verificación que genera son reales, no un mockup.
 *
 * Solo sirve para cuentas ya marcadas certificateExempt=true (ver scripts/madrinas-match-report.js
 * --apply): para una estudiante normal, la regla de asistencia debe revisarse con el motor completo
 * de la app (vía su propia descarga o el endpoint admin), no con este script.
 *
 * Imprime SOLO el PDF en base64 por stdout (para redirigirlo a un archivo local sin corromperlo);
 * el nombre, el número y el código de verificación van a stderr.
 *
 * Contra la base real:
 *   railway ssh --service app -- node scripts/issue-certificate-once.js <studentId> <moduleNumber>
 * O sin desplegar este archivo, pasándolo por stdin:
 *   cat scripts/issue-certificate-once.js | railway ssh --service app -- node - <studentId> <moduleNumber>
 */
const { readFile } = require('fs/promises');
const path = require('path');
const { randomInt } = require('crypto');
const { PrismaClient, Prisma } = require('@prisma/client');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Mismos datos que src/lib/modules.ts — mantener en sync si cambia el arte o las líneas.
const CERTIFICATE_WINDOW_DAYS = 5;
const CERTIFICATE_MODULES = [
  {
    number: 1,
    monthKey: '2026-10',
    art: 'public/certificados/modulo-1.jpg',
    name: { x1: 690, x2: 1290, y: 966 },
    studentNumber: { x1: 900, x2: 1290, y: 1004 },
  },
  {
    number: 2,
    monthKey: '2026-11',
    art: 'public/certificados/modulo-2.jpg',
    name: { x1: 680, x2: 1285, y: 951 },
    studentNumber: { x1: 955, x2: 1285, y: 1006 },
  },
  {
    number: 3,
    monthKey: '2026-12',
    art: 'public/certificados/modulo-3.jpg',
    name: { x1: 680, x2: 1295, y: 978 },
    studentNumber: { x1: 930, x2: 1295, y: 1038 },
  },
  {
    number: 4,
    monthKey: '2027-01',
    art: 'public/certificados/modulo-4.jpg',
    name: { x1: 678, x2: 1295, y: 974 },
    studentNumber: { x1: 952, x2: 1295, y: 1040 },
  },
  {
    number: 5,
    monthKey: '2027-02',
    art: 'public/certificados/modulo-5.jpg',
    name: { x1: 685, x2: 1285, y: 978 },
    studentNumber: { x1: 935, x2: 1285, y: 1030 },
  },
];
const CERTIFICATE_ART_SIZE = { width: 1776, height: 1296 };

function certificateOpensAt(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, lastDay - CERTIFICATE_WINDOW_DAYS + 1);
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateVerificationCode(year) {
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `ED-${year}-${suffix}`;
}

async function getOrCreateIssuance(prisma, studentId, moduleNumber, studentName, studentNumber) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.certificateIssuance.upsert({
        where: { studentId_moduleNumber: { studentId, moduleNumber } },
        create: {
          studentId,
          moduleNumber,
          verificationCode: generateVerificationCode(new Date().getFullYear()),
          studentName,
          studentNumber,
        },
        update: { studentName, studentNumber, downloadCount: { increment: 1 } },
      });
    } catch (error) {
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target || []).includes('verificationCode');
      if (!isCodeCollision || attempt === 4) throw error;
    }
  }
  throw new Error('No se pudo generar un código de verificación único.');
}

const TEXT_COLOR = rgb(0x5b / 255, 0x1a / 255, 0x6b / 255);
const FOOTER_COLOR = rgb(0.4, 0.4, 0.4);
const HORIZONTAL_PADDING = 10;
const FOOTER_HEIGHT = 32;
const FOOTER_FONT_SIZE = 12;
const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function fitFontSize(font, text, maxWidth, start) {
  let fontSize = start;
  while (font.widthOfTextAtSize(text, fontSize) > maxWidth && fontSize > 16) fontSize -= 1;
  return fontSize;
}

async function generateCertificatePdf({ module, studentName, studentNumber, verificationCode, issuedAt }) {
  const imageBytes = await readFile(path.join(process.cwd(), module.art));
  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(imageBytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const footerFont = await pdf.embedFont(StandardFonts.Helvetica);

  const { width: artWidth, height: artHeight } = CERTIFICATE_ART_SIZE;
  const page = pdf.addPage([artWidth, artHeight + FOOTER_HEIGHT]);
  page.drawImage(image, { x: 0, y: FOOTER_HEIGHT, width: artWidth, height: artHeight });

  const drawOnLine = (text, line, baseSize) => {
    const maxWidth = line.x2 - line.x1 - HORIZONTAL_PADDING * 2;
    const size = fitFontSize(font, text, maxWidth, baseSize);
    page.drawText(text, {
      x: line.x1 + HORIZONTAL_PADDING,
      y: artHeight - line.y + FOOTER_HEIGHT,
      size,
      font,
      color: TEXT_COLOR,
    });
  };

  drawOnLine(studentName, module.name, 40);
  drawOnLine(studentNumber, module.studentNumber, 36);

  const footerText = `Código de verificación: ${verificationCode} · Emitido el ${DATE_FORMAT.format(issuedAt)}`;
  page.drawText(footerText, {
    x: HORIZONTAL_PADDING,
    y: FOOTER_HEIGHT / 2 - FOOTER_FONT_SIZE / 3,
    size: FOOTER_FONT_SIZE,
    font: footerFont,
    color: FOOTER_COLOR,
  });

  return pdf.save();
}

async function main() {
  const studentId = process.argv[2];
  const moduleNumber = Number(process.argv[3]);
  if (!studentId || !moduleNumber) {
    console.error('Uso: node issue-certificate-once.js <studentId> <moduleNumber>');
    process.exit(1);
  }

  const module = CERTIFICATE_MODULES.find((m) => m.number === moduleNumber);
  if (!module) throw new Error(`Módulo inválido: ${moduleNumber}`);

  const prisma = new PrismaClient();
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, memberNumber: true, certificateExempt: true },
    });
    if (!student) throw new Error('Estudiante no encontrada.');
    if (!student.certificateExempt) {
      throw new Error(
        'Esta cuenta no tiene certificateExempt=true. Este script es solo para Madrinas exentas; ' +
          'para una estudiante normal, usa su propia descarga o el endpoint admin (valida asistencia).',
      );
    }

    const now = new Date();
    if (now < certificateOpensAt(module.monthKey)) {
      throw new Error(`El Módulo ${moduleNumber} todavía no abre su ventana de certificación.`);
    }

    const studentName = student.name;
    const studentNumber = student.memberNumber ?? '';
    const issuance = await getOrCreateIssuance(prisma, studentId, moduleNumber, studentName, studentNumber);

    const pdfBytes = await generateCertificatePdf({
      module,
      studentName,
      studentNumber,
      verificationCode: issuance.verificationCode,
      issuedAt: issuance.issuedAt,
    });

    console.error(`Estudiante: ${studentName} (${studentNumber || 'sin número'})`);
    console.error(`Código de verificación: ${issuance.verificationCode}`);
    console.error(`Emitido: ${issuance.issuedAt.toISOString()}`);
    console.log(Buffer.from(pdfBytes).toString('base64'));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('No se pudo emitir el certificado:', error.message);
  process.exit(1);
});
