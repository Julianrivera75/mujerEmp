'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({ value, max = 100, className }: ProgressBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200', className)}
    >
      <m.div
        className="h-full origin-left rounded-full bg-gradient-to-r from-role-from to-role-to"
        initial={{ scaleX: reduce ? pct / 100 : 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%' }}
      />
    </div>
  );
}
