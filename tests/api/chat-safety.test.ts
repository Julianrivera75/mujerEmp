import { beforeEach, describe, expect, it } from 'vitest';
import { POST as anonymize } from '@/app/api/admin/users/anonymize/route';
import { GET as listReports, PUT as reviewReport } from '@/app/api/admin/reports/route';
import { POST as broadcast } from '@/app/api/chat/broadcast/route';
import { POST as block } from '@/app/api/chat/block/route';
import { GET as listConversations, POST as startConversation } from '@/app/api/chat/conversations/route';
import { GET as listMessages, POST as sendMessage } from '@/app/api/chat/messages/route';
import { POST as report } from '@/app/api/chat/report/route';
import { GET as search } from '@/app/api/chat/search/route';
import { GET as downloadFile } from '@/app/api/upload/route';
import prisma from '@/lib/prisma';
import { resetRateLimit } from '@/lib/rate-limit';
import { deleteObject } from '@/lib/s3';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;
let conversationId: string;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
  for (const u of [w.sofia, w.carolina, w.admin]) {
    resetRateLimit(`chat:${u.id}`);
    resetRateLimit(`report:${u.id}`);
    resetRateLimit(`broadcast:${u.id}`);
  }
  const [userAId, userBId] = w.sofia.id < w.carolina.id ? [w.sofia.id, w.carolina.id] : [w.carolina.id, w.sofia.id];
  conversationId = (await prisma.conversation.create({ data: { userAId, userBId } })).id;
});

const post = (handler: (req: Request) => Promise<Response>, path: string, body: Record<string, unknown>) =>
  handler(request(path, { method: 'POST', body }));

const sendText = (body: string) => post(sendMessage, '/api/chat/messages', { conversationId, body });

describe('búsqueda en las conversaciones', () => {
  it('encuentra por el nombre de la otra persona y por el texto de un mensaje, solo en las propias', async () => {
    actAs(w.carolina);
    await sendText('Recuerda traer tu cuaderno morado');
    await post(startConversation, '/api/chat/conversations', { userId: w.lucia.id });

    actAs(w.sofia);
    const byText = await read(await search(request('/api/chat/search?q=cuaderno')));
    expect(byText.body.results).toHaveLength(1);
    expect(byText.body.results[0].snippet).toContain('cuaderno morado');

    const byName = await read(await search(request('/api/chat/search?q=carol')));
    expect(byName.body.results.map((r: { other: { name: string } }) => r.other.name)).toEqual(['Carolina']);

    // Lucia no participa de esa conversación: no ve nada de ella.
    actAs(w.lucia);
    expect((await read(await search(request('/api/chat/search?q=cuaderno')))).body.results).toHaveLength(0);
    // Con menos de dos letras no busca.
    expect((await read(await search(request('/api/chat/search?q=c')))).body.results).toHaveLength(0);
  });
});

describe('bloquear', () => {
  it('con un bloqueo ninguna de las dos puede escribirle a la otra, y desbloquear lo restablece', async () => {
    actAs(w.sofia);
    expect((await read(await post(block, '/api/chat/block', { userId: w.carolina.id, blocked: true }))).status).toBe(
      200,
    );

    expect((await read(await sendText('Hola'))).status).toBe(403);
    actAs(w.carolina);
    expect((await read(await sendText('Hola'))).status).toBe(403);
    expect((await read(await post(startConversation, '/api/chat/conversations', { userId: w.sofia.id }))).status).toBe(
      403,
    );

    const list = await read(await listConversations(request('/api/chat/conversations')));
    expect(list.body.conversations[0]).toMatchObject({ blockedByMe: false, canSend: false });
    actAs(w.sofia);
    const mine = await read(await listConversations(request('/api/chat/conversations')));
    expect(mine.body.conversations[0]).toMatchObject({ blockedByMe: true, canSend: false });

    expect((await read(await post(block, '/api/chat/block', { userId: w.carolina.id, blocked: false }))).status).toBe(
      200,
    );
    expect((await read(await sendText('Hola otra vez'))).status).toBe(200);
  });

  it('no se puede bloquear a una misma ni a alguien inexistente, y el mensaje a varias omite a quien bloqueó', async () => {
    actAs(w.sofia);
    expect((await read(await post(block, '/api/chat/block', { userId: w.sofia.id, blocked: true }))).status).toBe(400);
    expect((await read(await post(block, '/api/chat/block', { userId: 'no-existe', blocked: true }))).status).toBe(404);

    await post(block, '/api/chat/block', { userId: w.carolina.id, blocked: true });
    actAs(w.carolina);
    const sent = await read(
      await post(broadcast, '/api/chat/broadcast', { audience: { type: 'myStudents' }, body: 'Hola' }),
    );
    expect(sent.status).toBe(400); // la única destinataria la bloqueó
    const preview = await prisma.message.count({ where: { body: 'Hola' } });
    expect(preview).toBe(0);
  });
});

describe('reportar un mensaje', () => {
  it('la administración recibe el reporte con una copia del texto y un aviso', async () => {
    actAs(w.carolina);
    const sent = await read(await sendText('Mensaje que molesta'));
    const messageId = sent.body.message.id;

    actAs(w.sofia);
    const res = await read(await post(report, '/api/chat/report', { messageId, reason: 'Me incomoda' }));
    expect(res.status).toBe(200);
    // Reportar dos veces el mismo mensaje no duplica.
    await post(report, '/api/chat/report', { messageId, reason: 'Me incomoda' });
    expect(await prisma.messageReport.count()).toBe(1);
    expect(await prisma.notification.count({ where: { userId: w.admin.id, type: 'CHAT_REPORT' } })).toBe(1);

    actAs(w.admin);
    const list = await read(await listReports(request('/api/admin/reports')));
    expect(list.body.reports).toHaveLength(1);
    expect(list.body.reports[0]).toMatchObject({
      messageBody: 'Mensaje que molesta',
      reason: 'Me incomoda',
      reporter: { name: 'Sofia' },
      reported: { name: 'Carolina' },
      reviewedAt: null,
    });
    const id = list.body.reports[0].id;
    expect(
      (await read(await reviewReport(request('/api/admin/reports', { method: 'PUT', body: { id } })))).status,
    ).toBe(200);
    expect((await prisma.messageReport.findUniqueOrThrow({ where: { id } })).reviewedAt).not.toBeNull();

    actAs(w.sofia);
    expect((await read(await listReports(request('/api/admin/reports')))).status).toBe(403);
  });

  it('no se reportan los mensajes propios ni los de conversaciones ajenas', async () => {
    actAs(w.sofia);
    const own = await read(await sendText('Mío'));
    expect(
      (await read(await post(report, '/api/chat/report', { messageId: own.body.message.id, reason: 'Prueba' }))).status,
    ).toBe(400);

    actAs(w.lucia);
    expect(
      (await read(await post(report, '/api/chat/report', { messageId: own.body.message.id, reason: 'Prueba' }))).status,
    ).toBe(404);
  });
});

describe('archivos adjuntos', () => {
  const file = (ownerId: string, extra: Record<string, unknown> = {}) => ({
    key: `chat/${ownerId}/123-apunte.pdf`,
    name: 'apunte.pdf',
    type: 'application/pdf',
    size: 2048,
    ...extra,
  });

  it('se envía un archivo propio, la otra persona lo ve con su dirección firmada y puede quedar sin texto', async () => {
    actAs(w.sofia);
    const sent = await read(
      await post(sendMessage, '/api/chat/messages', { conversationId, body: '', attachment: file(w.sofia.id) }),
    );
    expect(sent.status).toBe(200);
    expect(sent.body.message.attachment).toMatchObject({ name: 'apunte.pdf', type: 'application/pdf', size: 2048 });

    actAs(w.carolina);
    const msgs = await read(await listMessages(request(`/api/chat/messages?conversationId=${conversationId}`)));
    expect(msgs.body.messages[0].attachment.url).toBe(`https://firmada.test/chat/${w.sofia.id}/123-apunte.pdf`);
    const list = await read(await listConversations(request('/api/chat/conversations')));
    expect(list.body.conversations[0].lastMessage.body).toBe('Archivo: apunte.pdf');
    const notice = await prisma.notification.findFirstOrThrow({
      where: { userId: w.carolina.id, type: 'NEW_MESSAGE' },
    });
    expect(notice.body).toBe('Archivo adjunto: apunte.pdf');
  });

  it('rechaza un archivo ajeno, de tipo no permitido, y un mensaje sin texto ni archivo', async () => {
    actAs(w.sofia);
    const foreign = await read(
      await post(sendMessage, '/api/chat/messages', { conversationId, attachment: file(w.carolina.id) }),
    );
    expect(foreign.status).toBe(400);
    const badType = await read(
      await post(sendMessage, '/api/chat/messages', {
        conversationId,
        attachment: file(w.sofia.id, { type: 'application/x-msdownload', key: `chat/${w.sofia.id}/virus.exe` }),
      }),
    );
    expect(badType.status).toBe(400);
    expect((await read(await sendText('   '))).status).toBe(400);
    expect(await prisma.message.count()).toBe(0);
  });

  it('los archivos del chat no se abren por la ruta general de archivos, ni siquiera la administración', async () => {
    actAs(w.admin);
    const res = await read(await downloadFile(request(`/api/upload?key=chat/${w.sofia.id}/123-apunte.pdf`)));
    expect(res.status).toBe(403);
  });

  it('al anonimizar una cuenta se borran los archivos de sus conversaciones', async () => {
    await prisma.message.create({
      data: {
        conversationId,
        senderId: w.carolina.id,
        body: '',
        attachmentKey: `chat/${w.carolina.id}/guia.pdf`,
        attachmentName: 'guia.pdf',
        attachmentType: 'application/pdf',
        attachmentSize: 10,
      },
    });
    actAs(w.admin);
    const res = await read(await post(anonymize, '/api/admin/users/anonymize', { id: w.sofia.id }));
    expect(res.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith(`chat/${w.carolina.id}/guia.pdf`);
    expect(await prisma.conversation.count()).toBe(0);
  });
});
