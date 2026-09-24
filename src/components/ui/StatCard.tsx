'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  hint?: React.ReactNode;
  emphasize?: boolean;
  className?: string;
}

function useCountUp(target: number, reduce: boolean | null) {
  const [value, setValue] = useState(reduce ? target : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    if (started.current) return;
    started.current = true;
    const duration = 600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  return value;
}

export function StatCard({ label, value, icon: Icon, hint, emphasize, className }: StatCardProps) {
  const reduce = useReducedMotion();
  const display = useCountUp(value, reduce);

  return (
    <m.div
      variants={fadeUp}
      className={cn(
        'glass-card rounded-2xl border border-white p-6 shadow-soft',
        emphasize && 'bg-gradient-to-br from-role-soft to-white sm:col-span-2',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-role-soft text-role-accent">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums text-slate-800">{display}</p>
      {hint && <div className="mt-2 text-xs font-medium text-slate-500">{hint}</div>}
    </m.div>
  );
}
