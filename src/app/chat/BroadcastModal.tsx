'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Megaphone } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { logClientError } from '@/lib/client-log';
import { ROLE_META, type Role } from '@/lib/roles';

interface Options {
  allowed: boolean;
  isAdmin?: boolean;
  maxRecipients?: number;
  classes?: { id: string; title: string; students: number }[];
}

interface Recipient {
  id: string;
  name: string;
  avatar: string | null;
  roles: Role[];
}

interface Skipped {
  name: string;
  reason: string;
}

type AudienceKey = 'myStudents' | 'class' | 'STUDENT' | 'MENTOR' | 'everyone';

interface BroadcastModalProps {
  open: boolean;
  onClose: () => void;
  /** Se llama tras un envío exitoso para refrescar la lista de conversaciones. */
  onSent: () => void;
}

const MAX_LENGTH = 2000;

function audiencePayload(key: AudienceKey, classId: string) {
  if (key === 'class') return { type: 'class', classId };
  if (key === 'STUDENT' || key === 'MENTOR') return { type: 'role', role: key };
  return { type: key };
}

/** Escribir a varias personas a la vez: elige a quiénes, revisa la lista, escribe y confirma. */
export function BroadcastModal({ open, onClose, onSent }: BroadcastModalProps) {
  const [options, setOptions] = useState<Options | null>(null);
  const [audience, setAudience] = useState<AudienceKey>('myStudents');
  const [classId, setClassId] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loadingList, setLoadingList] = useState(false);
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ sent: number; skipped: Skipped[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    setAudience('myStudents');
    setClassId('');
    setBody('');
    setExcluded(new Set());
    setConfirming(false);
    setError('');
    setResult(null);
    fetch('/api/chat/broadcast')
      .then((res) => res.json())
      .then((data: Options) => setOptions(data))
      .catch((err) => logClientError('Error cargando opciones de envío:', err));
  }, [open]);

  // Vista previa de quiénes recibirían el mensaje con la audiencia elegida.
  useEffect(() => {
    if (!open || !options?.allowed || (audience === 'class' && !classId)) {
      setRecipients([]);
      setSkipped([]);
      return;
    }
    const controller = new AbortController();
    setLoadingList(true);
    setExcluded(new Set());
    setConfirming(false);
    setError('');
    fetch('/api/chat/broadcast/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: audiencePayload(audience, classId) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setRecipients([]);
          setSkipped([]);
          setError(data.error || 'No se pudo calcular la lista.');
          return;
        }
        setRecipients(data.recipients ?? []);
        setSkipped(data.skipped ?? []);
      })
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === 'AbortError'))
          logClientError('Error en la vista previa:', err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false);
      });
    return () => controller.abort();
  }, [open, options, audience, classId]);

  const selected = useMemo(() => recipients.filter((r) => !excluded.has(r.id)), [recipients, excluded]);
  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: audiencePayload(audience, classId),
          body: body.trim(),
          excludeIds: Array.from(excluded),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar el mensaje.');
        setConfirming(false);
        return;
      }
      setResult({ sent: data.sent, skipped: data.skipped ?? [] });
      onSent();
    } catch (err) {
      logClientError('Error enviando a varias personas:', err);
      setError('Error de conexión. Tu mensaje sigue aquí: inténtalo de nuevo.');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const isAdmin = Boolean(options?.isAdmin);
  const canSend = body.trim().length > 0 && selected.length > 0 && !loadingList;

  return (
    <Modal open={open} onClose={() => !sending && onClose()} title="Mensaje a varias personas" size="lg">
      {!options ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : !options.allowed ? (
        <p className="text-sm text-slate-600">
          Solo las mentoras y la administración pueden escribir a varias personas.
        </p>
      ) : result ? (
        <div className="space-y-3" role="status">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Mensaje enviado a {result.sent} {result.sent === 1 ? 'persona' : 'personas'}.
          </p>
          <p className="text-xs text-slate-600">
            Cada persona lo recibió en su conversación contigo y puede responderte en privado.
          </p>
          {result.skipped.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">No se envió a {result.skipped.length}:</p>
              <ul className="mt-1 list-disc pl-4">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.name}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

          <Select label="¿A quiénes?" value={audience} onChange={(e) => setAudience(e.target.value as AudienceKey)}>
            <option value="myStudents">Todas mis estudiantes</option>
            <option value="class">Estudiantes de una clase</option>
            {isAdmin && <option value="STUDENT">Todas las estudiantes</option>}
            {isAdmin && <option value="MENTOR">Todas las mentoras</option>}
            {isAdmin && <option value="everyone">Toda la comunidad</option>}
          </Select>

          {audience === 'class' && (
            <Select label="Clase" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Elige una clase...</option>
              {(options.classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.students})
                </option>
              ))}
            </Select>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700" aria-live="polite">
                {loadingList
                  ? 'Calculando...'
                  : `Se enviará a ${selected.length} ${selected.length === 1 ? 'persona' : 'personas'}`}
              </p>
              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExcluded(excluded.size === 0 ? new Set(recipients.map((r) => r.id)) : new Set())}
                  className="text-xs font-bold text-role-ink hover:underline"
                >
                  {excluded.size === 0 ? 'Quitar a todas' : 'Elegir a todas'}
                </button>
              )}
            </div>
            <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
              {recipients.length === 0 ? (
                <li className="p-2 text-xs text-slate-500">
                  {audience === 'class' && !classId ? 'Elige una clase.' : 'No hay personas en esta lista.'}
                </li>
              ) : (
                recipients.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-role-soft">
                      <Avatar avatarKey={r.avatar} fallbackInitial={r.name.charAt(0)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">{r.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {r.roles.map((role) => ROLE_META[role].label).join(' · ')}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={!excluded.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Enviar a ${r.name}`}
                        className="h-4 w-4 rounded text-role-ink"
                      />
                    </label>
                  </li>
                ))
              )}
            </ul>
            {skipped.length > 0 && (
              <p className="mt-1.5 text-[11px] text-amber-800">
                {skipped.length} {skipped.length === 1 ? 'persona no puede' : 'personas no pueden'} recibirlo (cuenta
                inactiva o protección de menores).
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="broadcast-body"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Mensaje
            </label>
            <textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={MAX_LENGTH}
              placeholder="Escribe el mensaje que recibirá cada persona..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-800 focus:border-role-accent focus:outline-none focus:ring-2 focus:ring-role-accent/20"
            />
            <p className="mt-1 text-right text-[11px] text-slate-500">
              {body.length} / {MAX_LENGTH}
            </p>
          </div>

          {confirming ? (
            <div className="space-y-2 rounded-2xl border border-role-accent/30 bg-role-soft p-3" role="alertdialog">
              <p className="text-sm font-bold text-slate-800">
                ¿Enviar a {selected.length} {selected.length === 1 ? 'persona' : 'personas'}?
              </p>
              <p className="text-xs text-slate-600">
                Cada una lo recibirá en su conversación contigo. No se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={sending}>
                  Volver
                </Button>
                <Button onClick={send} loading={sending}>
                  Sí, enviar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirming(true)}
                disabled={!canSend}
                leftIcon={<Megaphone className="h-4 w-4" />}
              >
                Revisar y enviar
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
