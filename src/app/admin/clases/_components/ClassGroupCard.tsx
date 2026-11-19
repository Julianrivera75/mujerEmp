'use client';

import React from 'react';
import { Clock, Edit3, Radio, Trash2, Video, Youtube } from 'lucide-react';
import { ClassGallery } from '@/components/ClassGallery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/Badge';
import { formatDateLong, formatTimeRange, formatWeekdayDate } from '@/lib/format';
import { dayKeyOf } from '@/lib/attendance-days';
import { safeHref } from '@/lib/validators';
import type { ClassItem } from '../types';

interface ClassGroupCardProps {
  /** Clases del mismo día bajo un solo link, en orden (2 o 3). */
  classes: ClassItem[];
  onEdit: (cls: ClassItem) => void;
  onDelete: (cls: ClassItem) => void;
}

/**
 * Varias clases de un mismo día bajo un solo link se ven en una sola tarjeta, cada una con su
 * propia foto, horario, mentora y conteo de asistencia — igual que la sala compartida de la
 * estudiante (RoomCard), pero con los datos y acciones que necesita el admin.
 */
export function ClassGroupCard({ classes, onEdit, onDelete }: ClassGroupCardProps) {
  const first = classes[0];
  const last = classes[classes.length - 1];
  const start = new Date(first.dateStart);
  const end = new Date(last.dateEnd);

  return (
    <Card variant="interactive" className="flex cursor-default flex-col p-6 md:col-span-2">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusPill label="Programación del día" tone="info" />
        <span className="inline-block text-xs font-semibold text-role-ink first-letter:uppercase">
          {formatWeekdayDate(start)}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          <Clock className="h-3.5 w-3.5" />
          {formatTimeRange(start, end)}
        </span>
      </div>

      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
        <Radio className="h-5 w-5 text-role-ink" />
        <span>{classes.length} clases bajo el mismo link</span>
      </h2>

      <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
          <Video className="h-4 w-4 text-teal-600" />
          Google Meet:
        </span>
        {first.meetLink ? (
          <a
            href={safeHref(first.meetLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[260px] truncate font-bold text-teal-700 underline hover:text-teal-900"
          >
            {first.meetLink}
          </a>
        ) : (
          <span className="italic text-amber-600">No configurado</span>
        )}
      </div>

      <ol className="space-y-3">
        {classes.map((cls) => {
          const clsStart = new Date(cls.dateStart);
          const clsEnd = new Date(cls.dateEnd);
          const endsAnotherDay = dayKeyOf(clsStart) !== dayKeyOf(clsEnd);
          return (
            <li key={cls.id} className="rounded-2xl border border-slate-100 bg-white/70 p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <ClassGallery
                  urls={cls.imageUrls ?? (cls.imageUrl ? [cls.imageUrl] : [])}
                  title={cls.title}
                  className="w-full flex-shrink-0 sm:w-28"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <StatusPill
                    label={cls.status}
                    tone={cls.status === 'FINALIZADA' ? 'neutral' : 'success'}
                    pulse={cls.status !== 'FINALIZADA'}
                  />
                  <p className="break-words text-sm font-bold text-slate-800">{cls.title}</p>
                  {cls.description && <p className="line-clamp-2 text-xs text-slate-500">{cls.description}</p>}
                  {endsAnotherDay && (
                    <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                      Termina el {formatDateLong(clsEnd)}. Revisa que la fecha de fin sea correcta.
                    </p>
                  )}
                  <p className="text-xs text-slate-600">
                    <Clock className="mr-1 inline h-3.5 w-3.5 text-role-ink" />
                    {formatTimeRange(clsStart, clsEnd)} · Mentora:{' '}
                    <strong className="text-teal-700">{cls.mentor.name}</strong>
                  </p>
                  <p className="text-xs text-slate-600">
                    Estudiantes citadas: <strong className="text-role-ink">{cls.enrollments.length} alumnas</strong>
                    {' · '}
                    Entraron:{' '}
                    <strong className="text-emerald-600">
                      {cls.attendances.length} de {cls.enrollments.length}
                    </strong>
                  </p>
                  {cls.youtubeUrl && (
                    <a
                      href={safeHref(cls.youtubeUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 underline hover:text-red-800"
                    >
                      <Youtube className="h-3.5 w-3.5" />
                      Ver grabación en YouTube
                    </a>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-start gap-2 sm:flex-col">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => onEdit(cls)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => onDelete(cls)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
