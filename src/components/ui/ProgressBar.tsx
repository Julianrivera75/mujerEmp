'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ProgressBarProps {
  value?: number;
  max?: number;
  label?: string;
  /** Animación corta, para progresos que cambian con frecuencia (por ejemplo, una subida). */
  fast?: boolean;
  /** Sin porcentaje conocido (por ejemplo, mientras el servidor guarda): barra animada. */
  indeterminate?: boolean;
  className?: string;
}

export function ProgressBar({
  value = 0,
  max = 100,
  label = 'Progreso',
  fast,
  indeterminate,
  className,
}: ProgressBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  if (indeterminate) {
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-busy="true"
        className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200', className)}
      >
        <div
          className={cn(
            'h-full w-2/5 rounded-full bg-gradient-to-r from-role-from to-role-to',
            !reduce && 'animate-progress-slide',
          )}
        />
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200', className)}
    >
      <m.div
        className="h-full origin-left rounded-full bg-gradient-to-r from-role-from to-role-to"
        initial={{ scaleX: reduce ? pct / 100 : 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: reduce ? 0 : fast ? 0.2 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%' }}
      />
    </div>
  );
}
