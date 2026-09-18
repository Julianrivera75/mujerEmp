import React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'glass' | 'flat' | 'interactive' | 'tinted';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  as?: 'div';
}

const VARIANT_CLS: Record<Variant, string> = {
  glass: 'glass-card',
  flat: 'glass-card--flat',
  interactive: 'glass-card glass-card-hover cursor-pointer',
  tinted: 'bg-role-soft border border-role-accent/15',
};

export function Card({ variant = 'glass', className, ...rest }: CardProps) {
  return <div className={cn('rounded-2xl border border-white shadow-soft', VARIANT_CLS[variant], className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 pt-4 border-t border-slate-100', className)} {...rest} />;
}

interface InteractiveCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function InteractiveCard({ className, ...rest }: InteractiveCardProps) {
  return (
    <button
      type="button"
      className={cn(
        'text-left w-full rounded-2xl border border-white shadow-soft glass-card glass-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2',
        className,
      )}
      {...rest}
    />
  );
}
