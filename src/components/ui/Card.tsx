import React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'glass' | 'flat' | 'interactive' | 'tinted';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const VARIANT_CLS: Record<Variant, string> = {
  glass: 'glass-card',
  flat: 'glass-card--flat',
  interactive: 'glass-card glass-card-hover cursor-pointer',
  tinted: 'bg-role-soft border border-role-accent/15',
};

export function Card({ variant = 'glass', className, ...rest }: CardProps) {
  return (
    <div className={cn('rounded-2xl border border-white shadow-soft', VARIANT_CLS[variant], className)} {...rest} />
  );
}
