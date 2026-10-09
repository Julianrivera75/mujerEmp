import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { canChat, pairIds } from '@/lib/chat';
import { isBlockedBetween, unreadByConversation } from '@/lib/chat-db';
import { presenceForViewer } from '@/lib/presence';
import prisma from '@/lib/prisma';
import { rolesOf } from '@/lib/roles';
import { startConversationSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const PEOPLE_SELECT = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  extraRoles: true,
  isMinor: true,
  status: true,
  anonymizedAt: true,
  lastSeenAt: true,
  showOnlineStatus: true,
} as const;

/** Conversaciones de la persona, con el último mensaje, los mensajes sin leer y la presencia de la otra persona. */
export const GET = withAuth('chat conversations GET', 'any', async (_req, user) => {
  const [me, conversations, unreadMap, blocks] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { showOnlineStatus: true } }),
    prisma.conversation.findMany({
      where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 100,
      include: {
        userA: { select: PEOPLE_SELECT },
        userB: { select: PEOPLE_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true, attachmentName: true },
        },
      },
    }),
    unreadByConversation(user.id),
    prisma.chatBlock.findMany({
      where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const viewer = { isAdmin: user.roles.includes('ADMIN'), showOnlineStatus: me?.showOnlineStatus ?? true };

  const blockedByMe = new Set(blocks.filter((b) => b.blockerId === user.id).map((b) => b.blockedId));
  const blockedMe = new Set(blocks.filter((b) => b.blockedId === user.id).map((b) => b.blockerId));

  const result = conversations.map((c) => {
    const isA = c.userAId === user.id;
    const other = isA ? c.userB : c.userA;
    const last = c.messages[0];
    return {
      id: c.id,
      other: {
        id: other.id,
        name: other.anonymizedAt ? 'Usuaria anonimizada' : other.name,
        avatar: other.anonymizedAt ? null : other.avatar,
        roles: rolesOf(other),
        presence: other.anonymizedAt ? { online: false, label: null } : presenceForViewer(viewer, other),
      },
      lastMessage: last
        ? {
            body: last.body || (last.attachmentName ? `Archivo: ${last.attachmentName}` : ''),
            createdAt: last.createdAt,
            mine: last.senderId === user.id,
          }
        : null,
      blockedByMe: blockedByMe.has(other.id),
      canSend: !blockedByMe.has(other.id) && !blockedMe.has(other.id),
      lastMessageAt: c.lastMessageAt,
      unread: unreadMap.get(c.id) ?? 0,
    };
  });

  return NextResponse.json({ conversations: result });
});

/** Obtiene (o crea) la conversación 1 a 1 con otra persona. */
export const POST = withAuth('chat conversations POST', 'any', async (req, user) => {
  const { userId } = await parseBody(req, startConversationSchema);
  if (userId === user.id) throw new HttpError(400, 'No puedes escribirte a ti misma.');

  const [meRow, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: PEOPLE_SELECT }),
    prisma.user.findUnique({ where: { id: userId }, select: PEOPLE_SELECT }),
  ]);
  if (!meRow || !other || other.anonymizedAt || other.status !== 'ACTIVO') {
    throw new HttpError(404, 'No se encontró a esa persona.');
  }
  if (!canChat(meRow, other)) {
    throw new HttpError(
      403,
      'Por protección de menores de edad, solo pueden conversar con mentores o con la administración.',
    );
  }

  if (await isBlockedBetween(user.id, userId)) throw new HttpError(403, 'No puedes escribirle a esta persona.');

  const [userAId, userBId] = pairIds(user.id, userId);
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
    select: { id: true },
  });
  return NextResponse.json({ conversation });
});
