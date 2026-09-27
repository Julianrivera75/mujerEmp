import { Suspense } from 'react';
import ChatClient from './ChatClient';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Cargando el chat...</div>}>
      <ChatClient />
    </Suspense>
  );
}
