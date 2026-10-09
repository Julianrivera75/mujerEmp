'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { PresenceDot } from '@/components/PresenceDot';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { logClientError } from '@/lib/client-log';
import { ROLE_META, type Role } from '@/lib/roles';

export interface Person {
  id: string;
  name: string;
  avatar: string | null;
  roles: Role[];
  presence: { online: boolean; label: string | null };
  conversationId?: string | null;
}

interface ContactPickerProps {
  onSelect: (person: Person) => void;
}

type RoleFilter = Role | 'ALL';

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'MENTOR', label: 'Mentoras' },
  { value: 'STUDENT', label: 'Estudiantes' },
  { value: 'ADMIN', label: 'Administración' },
];

const PAGE_SIZE = 30;

const roleLabels = (roles: Role[]) => roles.map((r) => ROLE_META[r].label).join(' · ');
const initialOf = (name: string) => name.trim().charAt(0).toUpperCase();

/** Directorio para iniciar una conversación: búsqueda, filtro por rol, lista por inicial y "Cargar más". */
export function ContactPicker({ onSelect }: ContactPickerProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (offset: number, q: string, roleFilter: RoleFilter, signal?: AbortSignal) => {
    const query = new URLSearchParams({ q, limit: String(PAGE_SIZE), offset: String(offset) });
    if (roleFilter !== 'ALL') query.set('role', roleFilter);
    try {
      const res = await fetch(`/api/chat/contacts?${query}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      setPeople((prev) => (offset === 0 ? data.contacts : [...prev, ...data.contacts]));
      setTotal(data.total ?? 0);
      setNextOffset(data.nextOffset ?? null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      logClientError('Error buscando personas:', err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => void load(0, search, role, controller.signal), 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, role, load]);

  return (
    <div className="flex min-h-0 flex-col gap-2 border-b border-slate-100 p-3">
      <Input
        aria-label="Buscar personas"
        placeholder="Buscar a una persona por nombre..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="h-4 w-4" />}
      />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por rol">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setRole(f.value)}
            aria-pressed={role === f.value}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-bold transition-colors',
              role === f.value
                ? 'border-role-accent bg-role-soft text-role-ink'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-semibold text-slate-500" aria-live="polite">
        {loading && people.length === 0 ? 'Buscando...' : `${total} ${total === 1 ? 'persona' : 'personas'}`}
      </p>

      <div className="max-h-72 overflow-y-auto md:max-h-80">
        {!loading && people.length === 0 ? (
          <EmptyState icon={Users} title="Nadie coincide" description="Prueba con otro nombre o cambia el filtro." />
        ) : (
          <ul>
            {people.map((p, i) => {
              const showInitial = i === 0 || initialOf(people[i - 1].name) !== initialOf(p.name);
              return (
                <React.Fragment key={p.id}>
                  {showInitial && (
                    <li
                      aria-hidden="true"
                      className="sticky top-0 z-10 bg-white/95 px-2 py-1 text-[11px] font-bold text-role-ink"
                    >
                      {initialOf(p.name)}
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={() => onSelect(p)}
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
                </React.Fragment>
              );
            })}
          </ul>
        )}
        {nextOffset !== null && (
          <button
            type="button"
            onClick={() => void load(nextOffset, search, role)}
            className="mt-1 w-full rounded-xl py-2 text-xs font-bold text-role-ink hover:bg-role-soft"
          >
            Cargar más
          </button>
        )}
      </div>
    </div>
  );
}
