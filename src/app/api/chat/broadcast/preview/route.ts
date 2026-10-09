import { NextResponse } from 'next/server';
import { parseBody, withAuth } from '@/lib/api';
import { resolveBroadcast } from '@/lib/chat-db';
import { broadcastPreviewSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Quiénes recibirían el mensaje con la audiencia elegida (misma regla que el envío). */
export const POST = withAuth('chat broadcast preview', 'any', async (req, user) => {
  const { audience } = await parseBody(req, broadcastPreviewSchema);
  const { recipients, skipped } = await resolveBroadcast(user, audience);
  return NextResponse.json({ recipients, skipped });
});
