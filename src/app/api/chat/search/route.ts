import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { rolesOf } from '@/lib/roles';
import { rankMatches } from '@/lib/text-search';

export const dynamic = 'force-dynamic';

const MIN_QUERY = 2;
const MAX_RESULTS = 30;
const SNIPPET_LENGTH = 90;
/** Conversaciones que se comparan por nombre (las más recientes de la persona). */
const MAX_CONVERSATIONS = 500;

const PERSON_SELECT = { id: true, name: true, avatar: true, role: true, extraRoles: true, anonymizedAt: true } as const;

/**
 * Busca en las conversaciones de la persona: por el nombre de la otra persona (sin importar tildes ni mayúsculas, las
 * más parecidas primero) o por el texto de los mensajes (las más recientes primero).
 */
export const GET = withAuth('chat search', 'any', async (req, user) => {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  if (q.length < MIN_QUERY) return NextResponse.json({ results: [] });

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: MAX_CONVERSATIONS,
    include: { userA: { select: PERSON_SELECT }, userB: { select: PERSON_SELECT } },
  });
  const withOther = conversations.map((c) => ({ conversation: c, other: c.userAId === user.id ? c.userB : c.userA }));

  // Por nombre: se ordena por parecido. Las cuentas anonimizadas no se pueden buscar por su nombre anterior.
  const byName = rankMatches(
    withOther.filter((c) => !c.other.anonymizedAt),
    q,
    (c) => [c.other.name],
  ).map((r) => r.item);

  // Por texto de los mensajes: último mensaje que coincide en cada conversación.
  const matches = await prisma.message.findMany({
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      body: { contains: q, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['conversationId'],
    select: { conversationId: true, body: true },
  });
  const snippetOf = new Map(matches.map((m) => [m.conversationId, m.body.slice(0, SNIPPET_LENGTH)]));
  const byText = withOther.filter((c) => snippetOf.has(c.conversation.id));

  const seen = new Set<string>();
  const merged = [...byName, ...byText].filter((c) => {
    if (seen.has(c.conversation.id)) return false;
    seen.add(c.conversation.id);
    return true;
  });

  return NextResponse.json({
    results: merged.slice(0, MAX_RESULTS).map(({ conversation, other }) => ({
      id: conversation.id,
      other: {
        id: other.id,
        name: other.anonymizedAt ? 'Usuaria anonimizada' : other.name,
        avatar: other.anonymizedAt ? null : other.avatar,
        roles: rolesOf(other),
      },
      snippet: snippetOf.get(conversation.id) ?? null,
    })),
  });
});
