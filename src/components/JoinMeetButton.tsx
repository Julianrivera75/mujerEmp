'use client';

import React, { useState } from 'react';
import { Video, CheckCircle, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { safeHref } from '@/lib/validators';
import { StatusPill } from '@/components/ui/Badge';
import { Tip } from '@/components/ui/Tip';
import { useToast } from '@/components/ui/Toast';

interface JoinMeetButtonProps {
  classId: string;
  meetLink: string | null | undefined;
  alreadyAttended: boolean;
  attendedAt?: string | null;
  onAttendanceSuccess?: () => void;
}

export default function JoinMeetButton({
  classId,
  meetLink,
  alreadyAttended: initialAttended,
  attendedAt: initialAttendedAt,
  onAttendanceSuccess,
}: JoinMeetButtonProps) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [attended, setAttended] = useState(initialAttended);
  const [attendedTime, setAttendedTime] = useState<string | null>(
    initialAttendedAt
      ? new Date(initialAttendedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : null,
  );

  const handleJoin = async () => {
    if (!meetLink) {
      show('info', 'Aún no se ha publicado el enlace de Google Meet para esta clase.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId }),
      });

      const data = await res.json();

      if (res.ok) {
        setAttended(true);
        const now = new Date();
        setAttendedTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduceMotion) {
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#D946EF', '#9333EA', '#6366F1', '#14B8A6'],
            });
          } catch {
            // la animación es opcional
          }
        }

        if (onAttendanceSuccess) {
          onAttendanceSuccess();
        }
      } else {
        console.warn('Registro de asistencia:', data.error);
      }
    } catch (err) {
      console.error('Error al marcar asistencia:', err);
    } finally {
      setLoading(false);
      const safeMeetLink = safeHref(meetLink);
      if (safeMeetLink) window.open(safeMeetLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (!meetLink) {
    return <StatusPill label="Enlace de Meet pendiente de publicación" tone="warning" pulse />;
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <Button
        onClick={handleJoin}
        loading={loading}
        size="lg"
        className="!bg-gradient-to-r !from-emerald-500 !via-teal-600 !to-cyan-600 !shadow-teal-500/25"
        leftIcon={!loading ? <Video className="h-5 w-5" /> : undefined}
        rightIcon={<ExternalLink className="h-4 w-4 opacity-75" />}
      >
        Unirme a clase en Google Meet
      </Button>

      {attended ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>¡Asistencia registrada{attendedTime ? ` (${attendedTime})` : ''}!</span>
        </div>
      ) : (
        <Tip className="border-none bg-transparent p-0">Dar clic registrará tu asistencia automáticamente.</Tip>
      )}
    </div>
  );
}
