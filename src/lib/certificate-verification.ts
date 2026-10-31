import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from './prisma';

// Sin 0/O/1/I/L: se leen en voz alta sin ambigüedad al verificar un certificado por teléfono o chat.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Código de verificación único, formato ED-AAAA-XXXXXX (año de emisión + 6 caracteres aleatorios). */
export function generateVerificationCode(year: number = new Date().getFullYear()): string {
  let suffix = '';
  for (let i = 0; i < CODE_LENGTH; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `ED-${year}-${suffix}`;
}

const MAX_CODE_ATTEMPTS = 5;

/**
 * Certificado emitido de (estudiante, módulo): la primera descarga crea el código de verificación;
 * las siguientes reutilizan el mismo código y solo actualizan la foto del nombre/número y el contador.
 */
export async function getOrCreateIssuance(
  studentId: string,
  moduleNumber: number,
  studentName: string,
  studentNumber: string,
) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await prisma.certificateIssuance.upsert({
        where: { studentId_moduleNumber: { studentId, moduleNumber } },
        create: { studentId, moduleNumber, verificationCode: generateVerificationCode(), studentName, studentNumber },
        update: { studentName, studentNumber, downloadCount: { increment: 1 } },
      });
    } catch (error) {
      // Colisión extremadamente improbable del código de verificación: se reintenta con uno nuevo.
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('verificationCode');
      if (!isCodeCollision || attempt === MAX_CODE_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error('No se pudo generar un código de verificación único.');
}
