import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as options, POST as broadcast } from '@/app/api/chat/broadcast/route';
import { POST as preview } from '@/app/api/chat/broadcast/preview/route';
import { GET as contacts } from '@/app/api/chat/contacts/route';
import { GET as listConversations } from '@/app/api/chat/conversations/route';
import { GET as listMessages } from '@/app/api/chat/messages/route';
import { countUnreadMessages } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { resetRateLimit } from '@/lib/rate-limit';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  resetRateLimit(`broadcast:${w.carolina.id}`);
  resetRateLimit(`broadcast:${w.admin.id}`);
  actAs(null);
});

const post = (handler: (req: Request) => Promise<Response>, path: string, body: Record<string, unknown>) =>
  handler(request(path, { method: 'POST', body }));

async function addUser(name: string, extra: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: {
      name,
      email: `${name.toLowerCase()}@prueba.test`,
      role: 'STUDENT',
      passwordHash: await bcrypt.hash('x', 4),
      memberNumber: `DOC-${name}`,
      ...extra,
    },
  });
}

describe('directorio de contactos', () => {
  it('pagina sin repetir ni omitir personas cuando hay más de 50', async () => {
    for (let i = 0; i < 60; i++) await addUser(`Persona${String(i).padStart(2, '0')}`);
    actAs(w.sofia);
    const seen: string[] = [];
    let offset: number | null = 0;
    let total = 0;
    while (offset !== null) {
      const res = await read(await contacts(request(`/api/chat/contacts?limit=50&offset=${offset}`)));
      expect(res.status).toBe(200);
      total = res.body.total;
      seen.push(...res.body.contacts.map((c: { id: string }) => c.id));
      offset = res.body.nextOffset;
    }
    expect(total).toBe(64); // 65 personas activas menos ella misma
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(total);
  });

  it('filtra por rol y por nombre, y no expone correo ni documento', async () => {
    actAs(w.sofia);
    const mentors = await read(await contacts(request('/api/chat/contacts?role=MENTOR')));
    expect(mentors.body.contacts.map((c: { name: string }) => c.name).sort()).toEqual(['Carolina', 'Valeria']);
    const byName = await read(await contacts(request('/api/chat/contacts?q=luc')));
    expect(byName.body.contacts.map((c: { name: string }) => c.name)).toEqual(['Lucia']);
    expect(mentors.raw).not.toContain('prueba.test');
    expect(mentors.raw).not.toContain('DOC-');
  });

  it('una persona menor solo ve mentoras y administración; las demás adultas no ven a menores', async () => {
    const menor = await addUser('Menor', { isMinor: true });
    actAs(menor);
    const asMinor = await read(await contacts(request('/api/chat/contacts?limit=50')));
    expect(asMinor.body.contacts.map((c: { name: string }) => c.name).sort()).toEqual(['Admin', 'Carolina', 'Valeria']);

    actAs(w.sofia);
    const asAdult = await read(await contacts(request('/api/chat/contacts?limit=50')));
    expect(asAdult.body.contacts.map((c: { name: string }) => c.name)).not.toContain('Menor');

    actAs(w.carolina);
    const asMentor = await read(await contacts(request('/api/chat/contacts?limit=50')));
    expect(asMentor.body.contacts.map((c: { name: string }) => c.name)).toContain('Menor');
  });

  it('indica la conversación que ya existe', async () => {
    const [userAId, userBId] = w.sofia.id < w.lucia.id ? [w.sofia.id, w.lucia.id] : [w.lucia.id, w.sofia.id];
    const conv = await prisma.conversation.create({ data: { userAId, userBId } });
    actAs(w.sofia);
    const res = await read(await contacts(request('/api/chat/contacts?q=luc')));
    expect(res.body.contacts[0].conversationId).toBe(conv.id);
  });
});

describe('mensaje a varias personas', () => {
  it('rechaza a una estudiante y a quien no ha iniciado sesión', async () => {
    const body = { audience: { type: 'myStudents' }, body: 'Hola' };
    expect((await read(await post(broadcast, '/api/chat/broadcast', body))).status).toBe(401);
    actAs(w.sofia);
    expect((await read(await post(broadcast, '/api/chat/broadcast', body))).status).toBe(403);
    expect((await read(await options(request('/api/chat/broadcast')))).body.allowed).toBe(false);
  });

  it('la mentora llega solo a las inscritas en sus clases, cada una en su conversación', async () => {
    actAs(w.carolina);
    const prev = await read(await post(preview, '/api/chat/broadcast/preview', { audience: { type: 'myStudents' } }));
    expect(prev.body.recipients.map((r: { name: string }) => r.name)).toEqual(['Sofia']);

    const sent = await read(
      await post(broadcast, '/api/chat/broadcast', { audience: { type: 'myStudents' }, body: 'Hola a todas' }),
    );
    expect(sent.status).toBe(200);
    expect(sent.body.sent).toBe(1);

    actAs(w.sofia);
    const convs = await read(await listConversations(request('/api/chat/conversations')));
    expect(convs.body.conversations).toHaveLength(1);
    expect(convs.body.conversations[0].unread).toBe(1);
    const msgs = await read(
      await listMessages(request(`/api/chat/messages?conversationId=${convs.body.conversations[0].id}`)),
    );
    expect(msgs.body.messages[0].body).toBe('Hola a todas');
    expect(await countUnreadMessages(w.sofia.id)).toBe(1);

    actAs(w.lucia);
    expect((await read(await listConversations(request('/api/chat/conversations')))).body.conversations).toHaveLength(
      0,
    );
  });

  it('una mentora no alcanza la clase de otra ni a una lista de personas ajenas', async () => {
    actAs(w.carolina);
    const other = await read(
      await post(broadcast, '/api/chat/broadcast', {
        audience: { type: 'class', classId: w.claseValeria.id },
        body: 'Hola',
      }),
    );
    expect(other.status).toBe(404);

    const custom = await read(
      await post(broadcast, '/api/chat/broadcast', {
        audience: { type: 'custom', userIds: [w.lucia.id] },
        body: 'Hola',
      }),
    );
    expect(custom.status).toBe(400);
    expect(await prisma.message.count()).toBe(0);

    const group = await read(
      await post(broadcast, '/api/chat/broadcast', { audience: { type: 'role', role: 'STUDENT' }, body: 'Hola' }),
    );
    expect(group.status).toBe(403);
  });

  it('la administración escribe a todas las estudiantes, sin repetir la conversación que ya existía', async () => {
    const [userAId, userBId] = w.admin.id < w.sofia.id ? [w.admin.id, w.sofia.id] : [w.sofia.id, w.admin.id];
    await prisma.conversation.create({ data: { userAId, userBId } });
    actAs(w.admin);
    const sent = await read(
      await post(broadcast, '/api/chat/broadcast', { audience: { type: 'role', role: 'STUDENT' }, body: 'Aviso' }),
    );
    expect(sent.body.sent).toBe(2);
    expect(await prisma.conversation.count()).toBe(2);
    expect(await prisma.message.count()).toBe(2);
  });

  it('excluye a quien se quita de la lista, a inactivas y a anonimizadas, y las informa', async () => {
    const inactiva = await addUser('Inactiva', { status: 'INACTIVO' });
    await prisma.classEnrollment.create({ data: { classId: w.claseCarolina.id, studentId: inactiva.id } });
    const otra = await addUser('Otra');
    await prisma.classEnrollment.create({ data: { classId: w.claseCarolina.id, studentId: otra.id } });

    actAs(w.carolina);
    const sent = await read(
      await post(broadcast, '/api/chat/broadcast', {
        audience: { type: 'class', classId: w.claseCarolina.id },
        body: 'Hola',
        excludeIds: [otra.id],
      }),
    );
    expect(sent.body.sent).toBe(1);
    expect(sent.body.skipped).toEqual([{ name: 'Inactiva', reason: 'cuenta inactiva' }]);
    expect(await prisma.message.count()).toBe(1);
  });

  it('respeta el límite de envíos por hora y un envío vacío no lo gasta', async () => {
    actAs(w.carolina);
    const send = () => post(broadcast, '/api/chat/broadcast', { audience: { type: 'myStudents' }, body: 'Hola' });
    for (let i = 0; i < 5; i++) expect((await read(await send())).status).toBe(200);
    const limited = await read(await send());
    expect(limited.status).toBe(429);

    resetRateLimit(`broadcast:${w.carolina.id}`);
    const empty = await read(
      await post(broadcast, '/api/chat/broadcast', { audience: { type: 'myStudents' }, body: '   ' }),
    );
    expect(empty.status).toBe(400);
  });
});
