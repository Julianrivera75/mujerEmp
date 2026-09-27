'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { PresenceDot } from '@/components/PresenceDot';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { logClientError } from '@/lib/client-log';
import { formatDateLong } from '@/lib/format';
import { numberLabel } from '@/lib/labels';
import { ROLE_META, type Role } from '@/lib/roles';

interface PersonProfileData {
  id: string;
  name: string;
  avatar: string | null;
  roles: Role[];
  memberNumber: string | null;
  memberSince: string;
  presence: { online: boolean; label: string | null };
  email?: string;
  phone?: string | null;
  status?: string;
}

/** Perfil de otra persona: solo lectura. */
export default function PersonProfile({ personId }: { personId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [profile, setProfile] = useState<PersonProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/profile?id=${encodeURIComponent(personId)}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setProfile(data.profile);
      } catch (err) {
        logClientError('Error cargando el perfil:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [personId]);

  const sendMessage = async () => {
    setOpening(true);
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: personId }),
      });
      const data = await res.json();
      if (!res.ok) {
        show('error', data.error || 'No se pudo abrir la conversación.');
        return;
      }
      router.push(`/chat?c=${data.conversation.id}`);
    } catch (err) {
      logClientError('Error abriendo la conversación:', err);
      show('error', 'Error de conexión.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link
        href="/chat"
        className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-role-ink hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Volver al chat</span>
      </Link>

      {loading ? (
        <SkeletonCard />
      ) : notFound || !profile ? (
        <Card variant="glass" className="p-0">
          <EmptyState
            icon={MessageCircle}
            title="No encontramos a esta persona"
            description="Puede que la cuenta ya no exista."
          />
        </Card>
      ) : (
        <Card variant="glass" className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar avatarKey={profile.avatar} fallbackInitial={profile.name.charAt(0)} size="xl" ring />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-800">{profile.name}</h1>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {profile.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-role-soft px-3 py-0.5 text-[11px] font-bold text-role-ink"
                  >
                    {ROLE_META[role].label}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex justify-center">
                <PresenceDot online={profile.presence.online} label={profile.presence.label} />
              </div>
            </div>
          </div>

          <dl className="space-y-2.5 border-t border-slate-100 pt-4 text-sm">
            {profile.memberNumber && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{numberLabel(profile.roles[0])}</dt>
                <dd className="font-semibold text-slate-800">{profile.memberNumber}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">En la plataforma desde</dt>
              <dd className="font-semibold text-slate-800">{formatDateLong(profile.memberSince)}</dd>
            </div>
            {profile.email && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Correo (solo administración)</dt>
                <dd className="font-semibold text-slate-800">{profile.email}</dd>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Contacto (solo administración)</dt>
                <dd className="font-semibold text-slate-800">{profile.phone}</dd>
              </div>
            )}
          </dl>

          <Button
            className="w-full"
            loading={opening}
            onClick={sendMessage}
            leftIcon={<MessageCircle className="h-4 w-4" />}
          >
            Enviar mensaje
          </Button>
        </Card>
      )}
    </div>
  );
}
