import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as activity } from '@/app/api/activity/route';
import { POST as postAssignment } from '@/app/api/assignments/route';
import { POST as anonymize } from '@/app/api/admin/users/anonymize/route';
import { PUT as profile } from '@/app/api/auth/profile/route';
import { GET as contacts } from '@/app/api/chat/contacts/route';
import { GET as listConversations, POST as startConversation } from '@/app/api/chat/conversations/route';
import { GET as listMessages, POST as sendMessage } from '@/app/api/chat/messages/route';
import { POST as markRead } from '@/app/api/chat/read/route';
import { GET as listNotifications } from '@/app/api/notifications/route';
import { POST as readNotifications } from '@/app/api/notifications/read/route';
import { POST as postSubmission, PUT as gradeSubmission } from '@/app/api/submissions/route';
import { GET as userProfile } from '@/app/api/users/profile/route';
import { resetDueSoonThrottle } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { resetRateLimit } from '@/lib/rate-limit';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  vi.useRealTimers();
  await resetDb();
  w = await createWorld();
  resetDueSoonThrottle();
  actAs(null);
});

const post = (handler: (req: Request) => Promise<Response>, path: string, body: Record<string, unknown>) =>
  handler(request(path, { method: 'POST', body }));

async function conversationBetween(a: Parameters<typeof actAs>[0], otherId: string) {
  actAs(a);
  const res = await read(await post(startConversation, '/api/chat/conversations', { userId: otherId }));
  return res.body.conversation?.id as string;
}

describe('contactos del chat', () => {
  it('lista a las demás personas activas, sin la propia, las inactivas ni las anonimizadas, y busca por nombre', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { status: 'INACTIVO' } });
    await prisma.user.update({ where: { id: w.valeria.id }, data: { anonymizedAt: new Date() } });
    actAs(w.sofia);
    const all = await read(await contacts(request('/api/chat/contacts')));
    const names = all.body.contacts.map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(['Admin', 'Carolina']);

    const found = await read(await contacts(request('/api/chat/contacts?q=carol')));
    expect(found.body.contacts).toHaveLength(1);
    actAs(null);
    expect((await contacts(request('/api/chat/contacts'))).status).toBe(401);
  });
});

describe('conversaciones y mensajes', () => {
  it('crea una sola conversación por pareja, sin importar quién la inicia', async () => {
    const first = await conversationBetween(w.sofia, w.carolina.id);
    const again = await conversationBetween(w.carolina, w.sofia.id);
    expect(first).toBeTruthy();
    expect(again).toBe(first);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('no permite escribirse a una misma, a personas inexistentes, inactivas o anonimizadas', async () => {
    actAs(w.sofia);
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.sofia.id })).status).toBe(400);
    expect((await post(startConversation, '/api/chat/conversations', { userId: 'no-existe' })).status).toBe(404);
    await prisma.user.update({ where: { id: w.lucia.id }, data: { status: 'INACTIVO' } });
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.lucia.id })).status).toBe(404);
    await prisma.user.update({ where: { id: w.valeria.id }, data: { anonymizedAt: new Date() } });
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.valeria.id })).status).toBe(404);
  });

  it('los mensajes se intercambian, quedan sin leer para quien recibe y se marcan como leídos', async () => {
    const id = await conversationBetween(w.sofia, w.carolina.id);

    actAs(w.sofia);
    const sent = await read(
      await post(sendMessage, '/api/chat/messages', { conversationId: id, body: '  Hola, profe  ' }),
    );
    expect(sent.status).toBe(200);
    expect(sent.body.message).toMatchObject({ body: 'Hola, profe', mine: true });

    actAs(w.carolina);
    const conv = await read(await listConversations(request('/api/chat/conversations')));
    expect(conv.body.conversations[0]).toMatchObject({ unread: 1, lastMessage: { body: 'Hola, profe', mine: false } });
    expect(conv.body.conversations[0].other.name).toBe('Sofia');

    const beat = await read(await post(activity, '/api/activity', {}));
    expect(beat.body.unreadMessages).toBe(1);

    const messages = await read(await listMessages(request(`/api/chat/messages?conversationId=${id}`)));
    expect(messages.body.messages).toHaveLength(1);
    expect(messages.body.messages[0].mine).toBe(false);

    await post(markRead, '/api/chat/read', { conversationId: id });
    const after = await read(await listConversations(request('/api/chat/conversations')));
    expect(after.body.conversations[0].unread).toBe(0);

    // la respuesta llega a Sofia como no leída y el envío deja al remitente al día
    await post(sendMessage, '/api/chat/messages', { conversationId: id, body: 'Hola Sofia' });
    actAs(w.sofia);
    const sofia = await read(await listConversations(request('/api/chat/conversations')));
    expect(sofia.body.conversations[0].unread).toBe(1);
  });

  it('con after solo devuelve los mensajes más recientes', async () => {
    const id = await conversationBetween(w.sofia, w.carolina.id);
    actAs(w.sofia);
    await post(sendMessage, '/api/chat/messages', { conversationId: id, body: 'uno' });
    const cut = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 15));
    await post(sendMessage, '/api/chat/messages', { conversationId: id, body: 'dos' });
    const recent = await read(await listMessages(request(`/api/chat/messages?conversationId=${id}&after=${cut}`)));
    expect(recent.body.messages.map((m: { body: string }) => m.body)).toEqual(['dos']);
  });

  it('solo las dos participantes leen o escriben en la conversación', async () => {
    const id = await conversationBetween(w.sofia, w.carolina.id);
    actAs(w.lucia);
    expect((await listMessages(request(`/api/chat/messages?conversationId=${id}`))).status).toBe(404);
    expect((await post(sendMessage, '/api/chat/messages', { conversationId: id, body: 'intrusa' })).status).toBe(404);
    expect((await post(markRead, '/api/chat/read', { conversationId: id })).status).toBe(404);
    actAs(w.admin); // ni siquiera la administración lee conversaciones ajenas
    expect((await listMessages(request(`/api/chat/messages?conversationId=${id}`))).status).toBe(404);
  });

  it('valida el texto y limita la velocidad de envío', async () => {
    const id = await conversationBetween(w.sofia, w.carolina.id);
    actAs(w.sofia);
    expect((await post(sendMessage, '/api/chat/messages', { conversationId: id, body: '   ' })).status).toBe(400);
    expect((await post(sendMessage, '/api/chat/messages', { conversationId: id, body: 'x'.repeat(4001) })).status).toBe(
      400,
    );
    resetRateLimit(`chat:${w.sofia.id}`);
    for (let i = 0; i < 30; i++) {
      expect((await post(sendMessage, '/api/chat/messages', { conversationId: id, body: `m${i}` })).status).toBe(200);
    }
    const limited = await post(sendMessage, '/api/chat/messages', { conversationId: id, body: 'de más' });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).not.toBeNull();
    resetRateLimit(`chat:${w.sofia.id}`);
  });

  it('una persona menor de edad solo conversa con mentores o con la administración', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { isMinor: true } });
    actAs(w.sofia);
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.lucia.id })).status).toBe(403);
    actAs(w.lucia);
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.sofia.id })).status).toBe(403);
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.carolina.id })).status).toBe(200);
    actAs(w.admin);
    expect((await post(startConversation, '/api/chat/conversations', { userId: w.lucia.id })).status).toBe(200);
  });

  it('al anonimizar una cuenta se eliminan sus conversaciones y avisos', async () => {
    const id = await conversationBetween(w.sofia, w.carolina.id);
    await prisma.notification.create({
      data: { userId: w.sofia.id, type: 'NEW_ASSIGNMENT', title: 't', body: 'b', href: '/x', dedupeKey: 'k' },
    });
    actAs(w.admin);
    expect((await post(anonymize, '/api/admin/users/anonymize', { id: w.sofia.id })).status).toBe(200);
    expect(await prisma.conversation.count({ where: { id } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: w.sofia.id } })).toBe(0);
  });
});

describe('presencia y latido de actividad', () => {
  it('el latido guarda la última actividad y se muestra en línea a las demás personas', async () => {
    actAs(w.carolina);
    await post(activity, '/api/activity', {});
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.carolina.id } })).lastSeenAt).not.toBeNull();

    actAs(w.sofia);
    const list = await read(await contacts(request('/api/chat/contacts?q=carolina')));
    expect(list.body.contacts[0].presence).toEqual({ online: true, label: 'En línea' });
  });

  it('quien oculta su estado no lo muestra ni ve el de las demás, salvo la administración', async () => {
    actAs(w.carolina);
    await post(activity, '/api/activity', {});
    await prisma.user.update({ where: { id: w.carolina.id }, data: { showOnlineStatus: false } });

    actAs(w.sofia);
    let list = await read(await contacts(request('/api/chat/contacts?q=carolina')));
    expect(list.body.contacts[0].presence.label).toBeNull();

    actAs(w.admin);
    list = await read(await contacts(request('/api/chat/contacts?q=carolina')));
    expect(list.body.contacts[0].presence.online).toBe(true);

    await prisma.user.update({ where: { id: w.carolina.id }, data: { showOnlineStatus: true } });
    await prisma.user.update({ where: { id: w.sofia.id }, data: { showOnlineStatus: false } });
    actAs(w.sofia);
    list = await read(await contacts(request('/api/chat/contacts?q=carolina')));
    expect(list.body.contacts[0].presence.label).toBeNull();
  });

  it('la preferencia de presencia se cambia desde el perfil', async () => {
    actAs(w.sofia);
    const res = await read((await post(profile, '/api/auth/profile', { showOnlineStatus: false })) as Response);
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.sofia.id } })).showOnlineStatus).toBe(false);
  });
});

describe('perfil de otra persona', () => {
  const view = (id: string) => userProfile(request(`/api/users/profile?id=${id}`));

  it('muestra nombre, roles, número y correo (para conectar entre personas), pero oculta el contacto', async () => {
    actAs(w.sofia);
    const res = await read(await view(w.carolina.id));
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      name: 'Carolina',
      roles: ['MENTOR'],
      memberNumber: 'DOC-Carolina',
      email: 'carolina@prueba.test',
    });
    expect(res.body.profile).not.toHaveProperty('phone');
  });

  it('la administración sí ve el correo y el contacto', async () => {
    actAs(w.admin);
    const res = await read(await view(w.sofia.id));
    expect(res.body.profile).toMatchObject({ email: 'sofia@prueba.test', phone: '3000000000' });
  });

  it('una cuenta anonimizada, inexistente o una persona anónima no se consultan', async () => {
    await prisma.user.update({ where: { id: w.lucia.id }, data: { anonymizedAt: new Date() } });
    actAs(w.sofia);
    expect((await view(w.lucia.id)).status).toBe(404);
    expect((await view('no-existe')).status).toBe(404);
    actAs(null);
    expect((await view(w.carolina.id)).status).toBe(401);
  });
});

describe('notificaciones', () => {
  const mine = async () => (await read(await listNotifications(request('/api/notifications')))).body;

  it('una tarea nueva avisa a las estudiantes inscritas y no a las demás', async () => {
    actAs(w.carolina);
    const res = await read(
      await post(postAssignment, '/api/assignments', {
        classId: w.claseCarolina.id,
        title: 'Ensayo final',
        description: 'Escribe el ensayo final',
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      }),
    );
    expect(res.status).toBe(200);

    actAs(w.sofia);
    const sofia = await mine();
    const created = sofia.notifications.find((n: { type: string }) => n.type === 'NEW_ASSIGNMENT');
    expect(created).toMatchObject({ title: 'Nueva tarea', href: `/estudiante/tareas?tarea=${res.body.assignment.id}` });
    expect(sofia.unread).toBeGreaterThan(0);

    actAs(w.lucia);
    expect((await mine()).notifications).toHaveLength(0);
  });

  it('una entrega avisa a la mentora y la calificación avisa a la estudiante', async () => {
    actAs(w.sofia);
    await post(postSubmission, '/api/submissions', {
      assignmentId: w.tarea.id,
      notes: 'Listo',
      fileType: 'LINK',
      fileUrl: 'https://ejemplo.com/trabajo',
    });

    actAs(w.carolina);
    const carolina = await mine();
    expect(carolina.notifications[0]).toMatchObject({
      type: 'SUBMISSION_RECEIVED',
      href: `/mentor/tareas?tarea=${w.tarea.id}`,
    });

    await gradeSubmission(
      request('/api/submissions', { method: 'PUT', body: { submissionId: w.entrega.id, grade: 4.5 } }),
    );
    actAs(w.sofia);
    const sofia = await mine();
    expect(sofia.notifications.some((n: { type: string }) => n.type === 'SUBMISSION_GRADED')).toBe(true);
  });

  it('las tareas por vencer se avisan una sola vez con el latido de actividad', async () => {
    await prisma.assignment.create({
      data: {
        classId: w.claseCarolina.id,
        creatorId: w.carolina.id,
        title: 'Vence mañana',
        description: 'x',
        dueDate: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    await prisma.assignment.create({
      data: {
        classId: w.claseCarolina.id,
        creatorId: w.carolina.id,
        title: 'Vence en un mes',
        description: 'x',
        dueDate: new Date(Date.now() + 30 * 86400000),
      },
    });

    actAs(w.sofia);
    await post(activity, '/api/activity', {});
    resetDueSoonThrottle();
    await post(activity, '/api/activity', {});
    const due = (await mine()).notifications.filter((n: { type: string }) => n.type === 'ASSIGNMENT_DUE_SOON');
    expect(due).toHaveLength(1);
    expect(due[0].body).toContain('Vence mañana');
  });

  it('se marcan como leídas una o todas, y solo las propias', async () => {
    const own = await prisma.notification.create({
      data: { userId: w.sofia.id, type: 'NEW_ASSIGNMENT', title: 'a', body: 'a', href: '/x', dedupeKey: 'a' },
    });
    await prisma.notification.create({
      data: { userId: w.sofia.id, type: 'NEW_ASSIGNMENT', title: 'b', body: 'b', href: '/x', dedupeKey: 'b' },
    });
    const foreign = await prisma.notification.create({
      data: { userId: w.lucia.id, type: 'NEW_ASSIGNMENT', title: 'c', body: 'c', href: '/x', dedupeKey: 'c' },
    });

    actAs(w.sofia);
    await post(readNotifications, '/api/notifications/read', { id: foreign.id });
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: foreign.id } })).readAt).toBeNull();

    await post(readNotifications, '/api/notifications/read', { id: own.id });
    expect((await mine()).unread).toBe(1);
    await post(readNotifications, '/api/notifications/read', { all: true });
    expect((await mine()).unread).toBe(0);
    expect((await post(readNotifications, '/api/notifications/read', {})).status).toBe(400);
  });
});

describe('número de identificación por rol', () => {
  it('cualquier persona, incluida la administradora, edita su nombre, correo y número', async () => {
    actAs(w.admin);
    const res = await read(
      (await post(profile, '/api/auth/profile', { name: 'Admin Renombrada', memberNumber: 'ADM-001' })) as Response,
    );
    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: w.admin.id } });
    expect(saved.name).toBe('Admin Renombrada');
    expect(saved.memberNumber).toBe('ADM-001');

    actAs(w.carolina);
    await post(profile, '/api/auth/profile', { memberNumber: '  ' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.carolina.id } })).memberNumber).toBeNull();
  });
});
