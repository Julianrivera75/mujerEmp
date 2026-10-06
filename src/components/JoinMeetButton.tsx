'use client';

import React, { useState } from 'react';
import { Video, CheckCircle, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { safeHref } from '@/lib/validators';
import { StatusPill } from '@/components/ui/Badge';
import { Tip } from '@/components/ui/Tip';
import { useToast } from '@/components/ui/Toast';
import { formatTime } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

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
  const [attended, setAttended] = useState(initialAttended);
  const [attendedTime, setAttendedTime] = useState<string | null>(
    initialAttendedAt ? formatTime(initialAttendedAt) : null,
  );
  const safeMeetLink = safeHref(meetLink);

  // La asistencia se registra en segundo plano: abrir Meet no puede esperar a la red, porque en iPhone el navegador
  // bloquea las ventanas que no se abren en el mismo instante del toque.
  const registerAttendance = async () => {
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId }),
        // Sigue enviándose aunque la pestaña pase a segundo plano al abrir Meet.
        keepalive: true,
      });

      const data = await res.json();

      if (res.ok) {
        setAttended(true);
        const target = data.attendedClass as { id: string; title: string } | null;
        // Varias clases pueden compartir sala: si el clic se contó en otra charla, se aclara en cuál quedó.
        if (target && target.id !== classId) show('success', `Quedaste presente en «${target.title}».`);
        setAttendedTime(formatTime(new Date()));

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
        logClientError('Registro de asistencia:', data.error);
      }
    } catch (err) {
      logClientError('Error al marcar asistencia:', err);
    }
  };

  if (!safeMeetLink) {
    return <StatusPill label="Enlace de Meet pendiente de publicación" tone="warning" pulse />;
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      {/* Enlace nativo: el navegador abre Meet en el mismo toque, sin depender de la respuesta del servidor. */}
      <Button
        href={safeMeetLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void registerAttendance()}
        size="lg"
        className="!bg-gradient-to-r !from-emerald-500 !via-teal-600 !to-cyan-600 !shadow-teal-500/25"
        leftIcon={<Video className="h-5 w-5" />}
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
