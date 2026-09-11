'use client';

import React, { useState } from 'react';
import { Video, CheckCircle, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [loading, setLoading] = useState(false);
  const [attended, setAttended] = useState(initialAttended);
  const [attendedTime, setAttendedTime] = useState<string | null>(
    initialAttendedAt ? new Date(initialAttendedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null
  );

  const handleJoin = async () => {
    if (!meetLink) {
      alert('Aún no se ha publicado el enlace de Google Meet para esta clase.');
      return;
    }

    setLoading(true);

    try {
      // Registrar asistencia en el backend
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

        // Animación de celebración con confeti
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#c026d3', '#8b5cf6', '#ec4899', '#14b8a6'],
          });
        } catch {}

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
      // Abrir Google Meet en una nueva pestaña
      window.open(meetLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (!meetLink) {
    return (
      <div className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span>Enlace de Meet pendiente de publicación</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <button
        onClick={handleJoin}
        disabled={loading}
        className="group relative inline-flex items-center justify-center space-x-2.5 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Video className="w-5 h-5 transition-transform group-hover:scale-110" />
        )}
        <span>Unirme a Clase en Google Meet</span>
        <ExternalLink className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity" />
      </button>

      {attended ? (
        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>¡Asistencia registrada {attendedTime ? `(${attendedTime})` : ''}!</span>
        </div>
      ) : (
        <span className="text-xs text-slate-500 font-medium">
          💡 Dar clic registrará tu asistencia automáticamente.
        </span>
      )}
    </div>
  );
}
