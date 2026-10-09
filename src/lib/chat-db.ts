import type { Prisma, Role } from '@prisma/client';
import { HttpError } from './api';
import { canChat, pairIds, type ChatParty } from './chat';
import prisma from './prisma';
import { rolesOf } from './roles';

/** Tope de personas por envío a varias. */
export const BROADCAST_MAX_RECIPIENTS = 500;
/** Cuántos envíos a varias puede hacer una persona por hora. */
export const BROADCASTS_PER_HOUR = 5;

type BroadcastAudience =
  | { type: 'myStudents' }
  | { type: 'class'; classId: string }
  | { type: 'role'; role: Role }
  | { type: 'everyone' }
  | { type: 'custom'; userIds: string[] };

interface BroadcastRecipient {
  id: string;
  name: string;
  avatar: string | null;
  roles: Role[];
}

interface BroadcastSkipped {
  name: string;
  reason: string;
}

interface BroadcastResolution {
  recipients: BroadcastRecipient[];
  skipped: BroadcastSkipped[];
}

interface Sender {
  id: string;
  roles: readonly Role[];
}

const PARTY_SELECT = { id: true, name: true, avatar: true, role: true, extraRoles: true, isMinor: true } as const;

/** Condición para listar solo a quienes `canChat` permite: las personas menores solo ven mentoras y administración. */
export function reachableUsersFilter(me: ChatParty): Prisma.UserWhereInput {
  const supervises =
    me.role === 'MENTOR' || me.role === 'ADMIN' || me.extraRoles.some((r) => r === 'MENTOR' || r === 'ADMIN');
  const supervisorsOnly: Prisma.UserWhereInput = {
    OR: [{ role: { in: ['MENTOR', 'ADMIN'] } }, { extraRoles: { hasSome: ['MENTOR', 'ADMIN'] } }],
  };
  if (me.isMinor) return supervisorsOnly;
  // Quien no es mentora ni administración no puede escribirle a una persona menor de edad.
  return supervises ? {} : { isMinor: false };
}

/** Mensajes sin leer por conversación de una persona, en una sola consulta. */
export async function unreadByConversation(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ id: string; n: number }[]>`
    SELECT m."conversationId" AS id, COUNT(*)::int AS n
    FROM "Message" m
    JOIN "Conversation" c ON c.id = m."conversationId"
    WHERE (c."userAId" = ${userId} OR c."userBId" = ${userId})
      AND m."senderId" <> ${userId}
      AND (
        CASE WHEN c."userAId" = ${userId} THEN c."lastReadAtA" ELSE c."lastReadAtB" END IS NULL
        OR m."createdAt" > CASE WHEN c."userAId" = ${userId} THEN c."lastReadAtA" ELSE c."lastReadAtB" END
      )
    GROUP BY m."conversationId"`;
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** Clases hacia las que una persona puede dirigir un mensaje: la administración, todas; una mentora, las suyas. */
export async function targetableClasses(sender: Sender) {
  const isAdmin = sender.roles.includes('ADMIN');
  return prisma.classSession.findMany({
    where: isAdmin ? {} : { mentorId: sender.id },
    orderBy: { dateStart: 'desc' },
    take: 100,
    select: { id: true, title: true, dateStart: true, _count: { select: { enrollments: true } } },
  });
}

async function candidateIds(
  sender: Sender,
  audience: BroadcastAudience,
  isAdmin: boolean,
): Promise<string[] | 'active'> {
  switch (audience.type) {
    case 'myStudents': {
      const rows = await prisma.classEnrollment.findMany({
        where: { classSession: { mentorId: sender.id } },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      return rows.map((r) => r.studentId);
    }
    case 'class': {
      const cls = await prisma.classSession.findUnique({ where: { id: audience.classId }, select: { mentorId: true } });
      if (!cls || (!isAdmin && cls.mentorId !== sender.id)) throw new HttpError(404, 'No se encontró esa clase.');
      const rows = await prisma.classEnrollment.findMany({
        where: { classId: audience.classId },
        select: { studentId: true },
      });
      return rows.map((r) => r.studentId);
    }
    case 'role':
    case 'everyone':
      if (!isAdmin) throw new HttpError(403, 'Solo la administración puede escribir a todo un grupo.');
      return 'active';
    case 'custom': {
      const ids = Array.from(new Set(audience.userIds));
      if (isAdmin) return ids;
      // Una mentora elige entre las estudiantes de sus clases.
      const rows = await prisma.classEnrollment.findMany({
        where: { classSession: { mentorId: sender.id }, studentId: { in: ids } },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      return rows.map((r) => r.studentId);
    }
  }
}

/**
 * Calcula, en el servidor, quiénes recibirían el mensaje. Es la misma regla para la vista previa y para el envío:
 * excluye a quien escribe, cuentas inactivas o anonimizadas y a quienes `canChat` no permite.
 */
export async function resolveBroadcast(sender: Sender, audience: BroadcastAudience): Promise<BroadcastResolution> {
  const isAdmin = sender.roles.includes('ADMIN');
  if (!isAdmin && !sender.roles.includes('MENTOR')) {
    throw new HttpError(403, 'Solo las mentoras y la administración pueden escribir a varias personas.');
  }
  const me = await prisma.user.findUnique({ where: { id: sender.id }, select: PARTY_SELECT });
  if (!me) throw new HttpError(404, 'Cuenta no encontrada.');

  const ids = await candidateIds(sender, audience, isAdmin);
  const where: Prisma.UserWhereInput =
    ids === 'active'
      ? {
          status: 'ACTIVO',
          anonymizedAt: null,
          ...(audience.type === 'role'
            ? { OR: [{ role: audience.role }, { extraRoles: { has: audience.role } }] }
            : {}),
        }
      : { id: { in: ids } };

  if (ids !== 'active' && ids.length > BROADCAST_MAX_RECIPIENTS) {
    throw new HttpError(400, `Elige un grupo de hasta ${BROADCAST_MAX_RECIPIENTS} personas.`);
  }

  const people = await prisma.user.findMany({
    where: { ...where, id: { ...(ids === 'active' ? {} : { in: ids }), not: sender.id } },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: BROADCAST_MAX_RECIPIENTS + 1,
    select: { ...PARTY_SELECT, status: true, anonymizedAt: true },
  });
  if (people.length > BROADCAST_MAX_RECIPIENTS) {
    throw new HttpError(400, `Elige un grupo de hasta ${BROADCAST_MAX_RECIPIENTS} personas.`);
  }

  const recipients: BroadcastRecipient[] = [];
  const skipped: BroadcastSkipped[] = [];
  for (const p of people) {
    if (p.anonymizedAt) skipped.push({ name: 'Usuaria anonimizada', reason: 'cuenta anonimizada' });
    else if (p.status !== 'ACTIVO') skipped.push({ name: p.name, reason: 'cuenta inactiva' });
    else if (!canChat(me, p)) skipped.push({ name: p.name, reason: 'protección de menores de edad' });
    else recipients.push({ id: p.id, name: p.name, avatar: p.avatar, roles: rolesOf(p) });
  }
  return { recipients, skipped };
}

/**
 * Entrega el mismo mensaje a cada persona en su conversación 1 a 1 con quien escribe (se crea si no existe),
 * para que pueda responder en privado. Todo ocurre en una sola transacción.
 */
export async function deliverBroadcast(senderId: string, recipientIds: readonly string[], body: string) {
  if (recipientIds.length === 0) return 0;
  const now = new Date();
  const pairs = recipientIds.map((id) => pairIds(senderId, id));

  await prisma.$transaction(async (tx) => {
    await tx.conversation.createMany({
      data: pairs.map(([userAId, userBId]) => ({ userAId, userBId })),
      skipDuplicates: true,
    });
    const conversations = await tx.conversation.findMany({
      where: {
        OR: [
          { userAId: senderId, userBId: { in: [...recipientIds] } },
          { userBId: senderId, userAId: { in: [...recipientIds] } },
        ],
      },
      select: { id: true, userAId: true },
    });
    await tx.message.createMany({
      data: conversations.map((c) => ({ conversationId: c.id, senderId, body, createdAt: now })),
    });
    // Quien escribe tiene sus conversaciones al día.
    const asA = conversations.filter((c) => c.userAId === senderId).map((c) => c.id);
    const asB = conversations.filter((c) => c.userAId !== senderId).map((c) => c.id);
    if (asA.length) {
      await tx.conversation.updateMany({ where: { id: { in: asA } }, data: { lastMessageAt: now, lastReadAtA: now } });
    }
    if (asB.length) {
      await tx.conversation.updateMany({ where: { id: { in: asB } }, data: { lastMessageAt: now, lastReadAtB: now } });
    }
  });
  return recipientIds.length;
}
