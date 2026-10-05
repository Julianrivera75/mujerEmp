'use client';

import React, { useState } from 'react';
import { Clock, LogOut, Radio } from 'lucide-react';
import JoinMeetButton from '@/components/JoinMeetButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { Tip } from '@/components/ui/Tip';
import { useToast } from '@/components/ui/Toast';
import { logClientError } from '@/lib/client-log';
import { formatTimeRange, formatWeekdayDate } from '@/lib/format';
import { currentClassOf } from '@/lib/rooms';

export interface RoomClassItem {
  id: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  meetLink: string | null;
  status: string;
  mentor: { name: string };
  attendances: { studentId: string; joinedAt: string; source?: 'CLICK' | 'CARRY'; leftAt?: string | null }[];
}

interface RoomCardProps {
  /** Clases seguidas que comparten el mismo enlace de Meet, en orden. */
  classes: RoomClassItem[];
  userId: string;
  onChanged: () => void;
}

/**
 * Varias clases seguidas con el mismo enlace se muestran como una sola sala: la estudiante entra una vez y su
 * asistencia se registra en la clase que esté en curso y sigue con las siguientes mientras permanezca.
 */
export function RoomCard({ classes, userId, onChanged }: RoomCardProps) {
  const { show } = useToast();
  const [leaving, setLeaving] = useState(false);

  const now = new Date();
  const dated = classes.map((c) => ({ ...c, dateStart: new Date(c.dateStart), dateEnd: new Date(c.dateEnd) }));
  const current = currentClassOf(dated, now);
  const action = current ?? dated.find((c) => c.dateEnd > now) ?? dated[dated.length - 1];
  const mine = (c: Pick<RoomClassItem, 'attendances'>) => c.attendances.find((a) => a.studentId === userId);
  const roomOver = dated[dated.length - 1].dateEnd <= now;
  const canLeave = !roomOver && classes.some((c) => mine(c) && !mine(c)?.leftAt);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await fetch('/api/attendance/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: action.id }),
      });
      if (res.ok) {
        show('info', 'Listo: tu asistencia ya no continuará en las clases siguientes de esta sala.');
        onChanged();
      }
    } catch (err) {
      logClientError('Error al salir de la sala:', err);
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Card variant="glass" className="border-role-accent/20 p-6 shadow-lift sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill label="Sala compartida" tone="info" />
        <span className="text-xs font-bold text-role-ink">{formatWeekdayDate(dated[0].dateStart)}</span>
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          <Clock className="h-3.5 w-3.5" />
          {formatTimeRange(dated[0].dateStart, dated[dated.length - 1].dateEnd)}
        </span>
      </div>

      <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <Radio className="h-5 w-5 text-role-ink" />
        <span>{dated.length} clases seguidas en la misma sala</span>
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Entra una sola vez: tu asistencia se registra en la clase que esté en curso y continúa en las siguientes
        mientras sigas en la sala.
      </p>

      <ol className="mt-5 space-y-2">
        {dated.map((c) => {
          const attendance = mine(c);
          const ended = c.dateEnd <= now;
          const live = current?.id === c.id;
          return (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-slate-800">{c.title}</p>
                <p className="text-xs text-slate-500">
                  {formatTimeRange(c.dateStart, c.dateEnd)} · Mentora: <strong>{c.mentor.name}</strong>
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {live && <StatusPill label="En vivo" tone="success" pulse />}
                {!live && !ended && <StatusPill label="Próxima" tone="neutral" />}
                {attendance ? (
                  <StatusPill
                    label={attendance.source === 'CARRY' ? 'Presente (automática)' : 'Presente'}
                    tone="success"
                  />
                ) : (
                  ended && <StatusPill label="Sin registro" tone="warning" />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-col items-start gap-3">
        <JoinMeetButton
          classId={action.id}
          meetLink={action.meetLink}
          alreadyAttended={Boolean(mine(action))}
          attendedAt={mine(action)?.joinedAt}
          onAttendanceSuccess={onChanged}
        />
        {canLeave && (
          <Button
            variant="ghost"
            size="sm"
            loading={leaving}
            onClick={handleLeave}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Ya salí de la sala
          </Button>
        )}
        <Tip className="border-none bg-transparent p-0">
          Si te retiras antes de que termine, pulsa «Ya salí de la sala» para no quedar registrada en las clases que
          siguen.
        </Tip>
      </div>
    </Card>
  );
}
