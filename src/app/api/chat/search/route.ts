import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { rolesOf } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const MIN_QUERY = 2;
const MAX_RESULTS = 30;
const SNIPPET_LENGTH = 90;

/** Busca en las conversaciones de la persona: por el nombre de la otra persona o por el texto de los mensajes. */
export const GET = withAuth('chat search', 'any', async (req, user) => {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < MIN_QUERY) return NextResponse.json({ results: [] });

  const mine = { OR: [{ userAId: user.id }, { userBId: user.id }] };
  const conversations = await prisma.conversation.findMany({
    where: {
      AND: [
        mine,
        {
          OR: [
            { userA: { id: { not: user.id }, anonymizedAt: null, name: { contains: q, mode: 'insensitive' } } },
            { userB: { id: { not: user.id }, anonymizedAt: null, name: { contains: q, mode: 'insensitive' } } },
            { messages: { some: { body: { contains: q, mode: 'insensitive' } } } },
          ],
        },
      ],
    },
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: MAX_RESULTS,
    include: {
      userA: { select: { id: true, name: true, avatar: true, role: true, extraRoles: true, anonymizedAt: true } },
      userB: { select: { id: true, name: true, avatar: true, role: true, extraRoles: true, anonymizedAt: true } },
    },
  });

  // Último mensaje que coincide con el texto, para mostrarlo como fragmento.
  const matches = await prisma.message.findMany({
    where: { conversationId: { in: conversations.map((c) => c.id) }, body: { contains: q, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    distinct: ['conversationId'],
    select: { conversationId: true, body: true },
  });
  const snippetOf = new Map(matches.map((m) => [m.conversationId, m.body.slice(0, SNIPPET_LENGTH)]));

  return NextResponse.json({
    results: conversations.map((c) => {
      const other = c.userAId === user.id ? c.userB : c.userA;
      return {
        id: c.id,
        other: {
          id: other.id,
          name: other.anonymizedAt ? 'Usuaria anonimizada' : other.name,
          avatar: other.anonymizedAt ? null : other.avatar,
          roles: rolesOf(other),
        },
        snippet: snippetOf.get(c.id) ?? null,
      };
    }),
  });
});
