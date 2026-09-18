import React from 'react';
import { cn } from '@/lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'role';
}

const TONE_CLS: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-indigo-100 text-indigo-700',
  role: 'bg-role-soft text-role-accent',
};

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold', TONE_CLS[tone], className)}
      {...rest}
    />
  );
}

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const DOT_TONE: Record<StatusTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
  info: 'bg-indigo-500',
};

interface StatusPillProps {
  label: string;
  tone: StatusTone;
  pulse?: boolean;
  className?: string;
}

/** Pastilla de estado: siempre punto + texto, nunca solo color. */
export function StatusPill({ label, tone, pulse, className }: StatusPillProps) {
  return (
    <Badge tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : tone === 'info' ? 'info' : 'neutral'} className={className}>
      <span className={cn('w-1.5 h-1.5 rounded-full', DOT_TONE[tone], pulse && 'animate-pulse')} />
      <span>{label}</span>
    </Badge>
  );
}
