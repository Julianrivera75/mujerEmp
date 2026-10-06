'use client';

import React from 'react';
import { CheckCircle2, Clock, Radio } from 'lucide-react';
import JoinMeetButton from '@/components/JoinMeetButton';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { Tip } from '@/components/ui/Tip';
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
  attendances: { studentId: string; joinedAt: string }[];
}

interface RoomCardProps {
  /** Clases seguidas que comparten el mismo enlace de Meet, en orden. */
  classes: RoomClassItem[];
  userId: string;
  onChanged: () => void;
}

/**
 * Varias clases seguidas con el mismo enlace se muestran como una sola sala: la estudiante entra una vez y el clic se
 * cuenta en la charla que esté en curso. La asistencia se mide por día: entrar a una sola charla del día basta.
 */
export function RoomCard({ classes, userId, onChanged }: RoomCardProps) {
  const now = new Date();
  const dated = classes.map((c) => ({ ...c, dateStart: new Date(c.dateStart), dateEnd: new Date(c.dateEnd) }));
  const current = currentClassOf(dated, now);
  const action = current ?? dated.find((c) => c.dateEnd > now) ?? dated[dated.length - 1];
  const mine = (c: Pick<RoomClassItem, 'attendances'>) => c.attendances.find((a) => a.studentId === userId);
  const presentToday = classes.some((c) => mine(c));

  return (
    <Card variant="glass" className="border-role-accent/20 p-6 shadow-lift sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill label="Sala compartida" tone="info" />
        <span className="text-xs font-bold text-role-ink">{formatWeekdayDate(dated[0].dateStart)}</span>
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          <Clock className="h-3.5 w-3.5" />
          {formatTimeRange(dated[0].dateStart, dated[dated.length - 1].dateEnd)}
        </span>
        {presentToday && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Hoy ya quedaste presente
          </span>
        )}
      </div>

      <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <Radio className="h-5 w-5 text-role-ink" />
        <span>{dated.length} clases seguidas en la misma sala</span>
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Entra una sola vez con el botón. Tu asistencia se mide por día: con entrar a una de las charlas ya cuenta tu
        día.
      </p>

      <ol className="mt-5 space-y-2">
        {dated.map((c) => {
          const attendance = mine(c);
          const live = current?.id === c.id;
          const ended = c.dateEnd <= now;
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
                {attendance && <StatusPill label="Entraste" tone="success" />}
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
        <Tip className="border-none bg-transparent p-0">
          Si ya entraste a una charla hoy, no necesitas volver a marcar: tu día ya cuenta.
        </Tip>
      </div>
    </Card>
  );
}
