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
      className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-4', className)}
    >
      <div>
        {eyebrow && (
          <m.span
            variants={fadeUp}
            className="inline-block px-3 py-1 rounded-full bg-role-soft text-role-accent text-xs font-bold uppercase tracking-wider mb-2"
          >
            {eyebrow}
          </m.span>
        )}
        <m.h1 variants={fadeUp} className="font-display text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          {title}
        </m.h1>
        {description && (
          <m.p variants={fadeUp} className="mt-1.5 text-sm text-slate-600 max-w-prose">
            {description}
          </m.p>
        )}
        {date && (
          <m.p variants={fadeUp} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 capitalize">
            <CalendarDays className="w-3.5 h-3.5 text-role-accent" />
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
