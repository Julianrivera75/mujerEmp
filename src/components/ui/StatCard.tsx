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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        'glass-card rounded-2xl p-6 border border-white shadow-soft',
        emphasize && 'sm:col-span-2 bg-gradient-to-br from-role-soft to-white',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="w-10 h-10 rounded-2xl bg-role-soft text-role-accent flex items-center justify-center">
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
      </div>
      <p className="font-display tabular-nums text-3xl font-bold text-slate-800 mt-3">{display}</p>
      {hint && <div className="text-xs text-slate-500 mt-2 font-medium">{hint}</div>}
    </m.div>
  );
}
