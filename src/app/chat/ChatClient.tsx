'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Search, Send, UserRound } from 'lucide-react';
import { useActivity } from '@/components/ActivityProvider';
import { PresenceDot } from '@/components/PresenceDot';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { logClientError } from '@/lib/client-log';
import { formatDayMonthShort, formatTime } from '@/lib/format';
import { ROLE_META, type Role } from '@/lib/roles';

interface Presence {
  online: boolean;
  label: string | null;
}

interface Person {
  id: string;
  name: string;
  avatar: string | null;
  roles: Role[];
  presence: Presence;
}

interface ConversationItem {
  id: string;
  other: Person;
  lastMessage: { body: string; createdAt: string; mine: boolean } | null;
  lastMessageAt: string | null;
  unread: number;
}

interface MessageItem {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

const LIST_POLL_MS = 10_000;
const THREAD_POLL_MS = 5_000;

const roleLabels = (roles: Role[]) => roles.map((r) => ROLE_META[r].label).join(' · ');

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function ChatClient() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get('c');
  const { show } = useToast();
  const { refresh } = useActivity();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Person[]>([]);
  const [showNew, setShowNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageAt = useRef<string | null>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch (err) {
      logClientError('Error cargando conversaciones:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadConversations();
    }, LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  const markRead = useCallback(
    async (conversationId: string) => {
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(() => undefined);
      void refresh();
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    },
    [refresh],
  );

  // Al abrir una conversación se cargan sus mensajes; luego solo los nuevos.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    lastMessageAt.current = null;
    setLoadingThread(true);
    setMessages([]);

    const fetchMessages = async (initial: boolean) => {
      try {
        const query = new URLSearchParams({ conversationId: selectedId });
        if (!initial && lastMessageAt.current) query.set('after', lastMessageAt.current);
        const res = await fetch(`/api/chat/messages?${query}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: MessageItem[] = data.messages ?? [];
        if (cancelled) return;
        if (initial) {
          setMessages(incoming);
        } else if (incoming.length > 0) {
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            return [...prev, ...incoming.filter((m) => !known.has(m.id))];
          });
        }
        if (incoming.length > 0) {
          lastMessageAt.current = incoming[incoming.length - 1].createdAt;
          if (incoming.some((m) => !m.mine)) void markRead(selectedId);
        }
      } catch (err) {
        logClientError('Error cargando mensajes:', err);
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    };

    void fetchMessages(true).then(() => markRead(selectedId));
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchMessages(false);
    }, THREAD_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  // Búsqueda de personas para iniciar una conversación.
  useEffect(() => {
    if (!showNew) return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/contacts?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setContacts(data.contacts ?? []);
      } catch (err) {
        logClientError('Error buscando personas:', err);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [showNew, search]);

  const openConversation = (id: string) => router.push(`/chat?c=${id}`);

  const startWith = async (person: Person) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: person.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        show('error', data.error || 'No se pudo iniciar la conversación.');
        return;
      }
      setShowNew(false);
      setSearch('');
      await loadConversations();
      openConversation(data.conversation.id);
    } catch (err) {
      logClientError('Error iniciando conversación:', err);
      show('error', 'Error de conexión.');
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        show('error', data.error || 'No se pudo enviar el mensaje.');
        return;
      }
      setDraft('');
      setMessages((prev) => [...prev, data.message]);
      lastMessageAt.current = data.message.createdAt;
      void loadConversations();
    } catch (err) {
      logClientError('Error enviando mensaje:', err);
      show('error', 'Error de conexión. Tu mensaje sigue aquí: inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold text-slate-800">
          <MessageCircle className="h-6 w-6 text-role-ink" />
          <span>Chat</span>
        </h1>
        <Button size="sm" onClick={() => setShowNew((v) => !v)}>
          {showNew ? 'Cerrar búsqueda' : 'Nueva conversación'}
        </Button>
      </div>

      <div className="grid h-[calc(100dvh-14rem)] min-h-[28rem] grid-cols-1 overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-soft md:grid-cols-[320px_1fr]">
        {/* Lista de conversaciones y búsqueda */}
        <aside className={cn('flex min-h-0 flex-col border-slate-100 md:border-r', selectedId && 'hidden md:flex')}>
          {showNew && (
            <div className="space-y-2 border-b border-slate-100 p-3">
              <Input
                aria-label="Buscar personas"
                placeholder="Buscar a una persona por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              <ul className="max-h-56 overflow-y-auto">
                {contacts.length === 0 ? (
                  <li className="p-2 text-xs text-slate-500">No se encontraron personas.</li>
                ) : (
                  contacts.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => startWith(p)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-role-soft"
                      >
                        <Avatar avatarKey={p.avatar} fallbackInitial={p.name.charAt(0)} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{p.name}</span>
                          <span className="block truncate text-[11px] text-slate-500">{roleLabels(p.roles)}</span>
                        </span>
                        <PresenceDot online={p.presence.online} label={p.presence.label} dotOnly />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="p-4 text-center text-xs text-slate-500">Cargando conversaciones...</p>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="Aún no tienes conversaciones"
                description='Pulsa "Nueva conversación" para escribirle a una compañera o a una mentora.'
              />
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      aria-current={c.id === selectedId ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-role-soft',
                        c.id === selectedId && 'bg-role-soft',
                      )}
                    >
                      <Avatar avatarKey={c.other.avatar} fallbackInitial={c.other.name.charAt(0)} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-800">{c.other.name}</span>
                          {c.lastMessageAt && (
                            <span className="flex-shrink-0 text-[11px] text-slate-500">
                              {formatDayMonthShort(c.lastMessageAt)}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-xs',
                              c.unread > 0 ? 'font-bold text-slate-800' : 'text-slate-500',
                            )}
                          >
                            {c.lastMessage
                              ? `${c.lastMessage.mine ? 'Tú: ' : ''}${c.lastMessage.body}`
                              : 'Sin mensajes todavía'}
                          </span>
                          {c.unread > 0 && (
                            <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
                              {c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Hilo de mensajes */}
        <section className={cn('flex min-h-0 flex-col', !selectedId && 'hidden md:flex')}>
          {!selectedId || !selected ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={MessageCircle}
                title="Elige una conversación"
                description="Selecciona una conversación de la lista o inicia una nueva."
              />
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => router.push('/chat')}
                  aria-label="Volver a las conversaciones"
                  className="tap-target rounded-xl p-1.5 text-slate-600 hover:bg-role-soft md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar avatarKey={selected.other.avatar} fallbackInitial={selected.other.name.charAt(0)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{selected.other.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>{roleLabels(selected.other.roles)}</span>
                    <PresenceDot online={selected.other.presence.online} label={selected.other.presence.label} />
                  </div>
                </div>
                <Link
                  href={`/perfil/${selected.other.id}`}
                  className="tap-target flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-role-ink hover:bg-role-soft"
                >
                  <UserRound className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver perfil</span>
                </Link>
              </header>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
                {loadingThread && messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500">Cargando mensajes...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500">Escribe el primer mensaje.</p>
                ) : (
                  messages.map((m, i) => {
                    const date = new Date(m.createdAt);
                    const previous = messages[i - 1];
                    const newDay = !previous || !sameDay(new Date(previous.createdAt), date);
                    return (
                      <React.Fragment key={m.id}>
                        {newDay && (
                          <p className="py-1 text-center text-[11px] font-semibold text-slate-500">
                            {formatDayMonthShort(date)}
                          </p>
                        )}
                        <div className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                              m.mine
                                ? 'rounded-br-md bg-gradient-to-r from-role-from to-role-to text-white'
                                : 'rounded-bl-md bg-slate-100 text-slate-800',
                            )}
                          >
                            {m.body}
                            <span
                              className={cn(
                                'mt-0.5 block text-right text-[10px]',
                                m.mine ? 'text-white/80' : 'text-slate-500',
                              )}
                            >
                              {formatTime(date)}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-3">
                <label htmlFor="chat-draft" className="sr-only">
                  Escribe un mensaje
                </label>
                <textarea
                  id="chat-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Escribe un mensaje... (Enter para enviar)"
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-800 focus:border-role-accent focus:outline-none focus:ring-2 focus:ring-role-accent/20"
                />
                <Button type="submit" loading={sending} disabled={!draft.trim()} aria-label="Enviar mensaje">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
