'use client';

import React from 'react';
import { m } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { fadeUp, stagger } from '@/lib/motion';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  date?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Cabecera de página. Único momento orquestado: título + descripción entran escalonados al montar. */
export function PageHeader({ eyebrow, title, description, date, actions, className }: PageHeaderProps) {
  return (
    <m.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className={cn('flex flex-col justify-between gap-4 sm:flex-row sm:items-end', className)}
    >
      <div>
        {eyebrow && (
          <m.span
            variants={fadeUp}
            className="mb-2 inline-block rounded-full bg-role-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-role-accent"
          >
            {eyebrow}
          </m.span>
        )}
        <m.h1 variants={fadeUp} className="font-display text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          {title}
        </m.h1>
        {description && (
          <m.p variants={fadeUp} className="mt-1.5 max-w-prose text-sm text-slate-600">
            {description}
          </m.p>
        )}
        {date && (
          <m.p
            variants={fadeUp}
            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold capitalize text-slate-500"
          >
            <CalendarDays className="h-3.5 w-3.5 text-role-accent" />
            <span>{date}</span>
          </m.p>
        )}
      </div>
      {actions && (
        <m.div variants={fadeUp} className="flex flex-wrap gap-2.5">
          {actions}
        </m.div>
      )}
    </m.div>
  );
}
