import { beforeEach, describe, expect, it } from 'vitest';
import { POST as activity } from '@/app/api/activity/route';
import prisma from '@/lib/prisma';
import { read, request } from '../helpers/http';
import { actAs } from '../helpers/state';
import { createWorld, resetDb } from '../helpers/world';

let w: Awaited<ReturnType<typeof createWorld>>;

beforeEach(async () => {
  await resetDb();
  w = await createWorld();
  actAs(null);
});

const beat = async () => read(await activity(request('/api/activity', { method: 'POST' })));

describe('datos para los avisos emergentes (/api/activity)', () => {
  it('sin notificaciones sin leer no hay "latest"', async () => {
    actAs(w.sofia);
    const res = await beat();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: w.sofia.id, unreadNotifications: 0, latest: null });
  });

  it('devuelve la notificación sin leer más reciente y el conteo', async () => {
    const base = { userId: w.sofia.id, type: 'NEW_ASSIGNMENT' as const, href: '/estudiante/tareas' };
    await prisma.notification.create({
      data: { ...base, title: 'Primera', body: 'Texto uno', dedupeKey: 'a', createdAt: new Date(Date.now() - 60000) },
    });
    await prisma.notification.create({ data: { ...base, title: 'Segunda', body: 'Texto dos', dedupeKey: 'b' } });
    await prisma.notification.create({
      data: {
        ...base,
        title: 'Leída',
        body: 'Ya vista',
        dedupeKey: 'c',
        readAt: new Date(),
        createdAt: new Date(Date.now() + 60000),
      },
    });

    actAs(w.sofia);
    const res = await beat();
    expect(res.body.unreadNotifications).toBe(2);
    expect(res.body.latest).toMatchObject({ type: 'NEW_ASSIGNMENT', title: 'Segunda', body: 'Texto dos' });
    expect(res.body.latest.id).toBeDefined();
    // Solo trae lo necesario para el aviso: nada de la ruta interna ni de otras personas.
    expect(Object.keys(res.body.latest).sort()).toEqual(['body', 'id', 'title', 'type']);
  });

  it('cada persona ve solo sus notificaciones', async () => {
    await prisma.notification.create({
      data: { userId: w.sofia.id, type: 'NEW_ASSIGNMENT', title: 'De Sofia', body: 'x', href: '/x', dedupeKey: 'z' },
    });
    actAs(w.lucia);
    const res = await beat();
    expect(res.body).toMatchObject({ unreadNotifications: 0, latest: null });
  });
});
