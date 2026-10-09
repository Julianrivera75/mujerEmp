'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Field';
import { logClientError } from '@/lib/client-log';

interface SearchResult {
  id: string;
  other: { id: string; name: string; avatar: string | null };
  snippet: string | null;
}

interface ChatSearchProps {
  onOpen: (conversationId: string) => void;
  /** Avisa si hay una búsqueda activa, para que la lista de conversaciones se oculte mientras tanto. */
  onActiveChange: (active: boolean) => void;
}

const MIN_QUERY = 2;

/** Buscador de las conversaciones propias: por el nombre de la otra persona o por el texto de los mensajes. */
export function ChatSearch({ onOpen, onActiveChange }: ChatSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const active = query.trim().length >= MIN_QUERY;

  useEffect(() => {
    onActiveChange(active);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (!active) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) logClientError('Error buscando:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, query]);

  return (
    <div className="border-b border-slate-100 p-3">
      <Input
        aria-label="Buscar en mis conversaciones"
        placeholder="Buscar en mis conversaciones..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
      />
      {active && (
        <ul className="mt-2 max-h-72 overflow-y-auto" aria-live="polite">
          {loading && results.length === 0 ? (
            <li className="p-2 text-xs text-slate-500">Buscando...</li>
          ) : results.length === 0 ? (
            <li className="p-2 text-xs text-slate-500">No se encontró nada en tus conversaciones.</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    onOpen(r.id);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-role-soft"
                >
                  <Avatar avatarKey={r.other.avatar} fallbackInitial={r.other.name.charAt(0)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{r.other.name}</span>
                    {r.snippet && <span className="block truncate text-[11px] text-slate-500">{r.snippet}</span>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
