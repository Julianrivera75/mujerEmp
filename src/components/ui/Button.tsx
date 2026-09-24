'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = BaseProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const SIZE_CLS: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
};

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'text-white bg-gradient-to-r from-role-from to-role-to shadow-glow hover:brightness-105',
  secondary:
    'glass-card--flat text-slate-700 border border-slate-200/80 hover:border-role-accent/40 hover:text-role-accent',
  ghost: 'text-slate-600 hover:bg-role-soft hover:text-role-accent',
  danger: 'text-white bg-gradient-to-r from-red-600 to-rose-600 shadow-lift hover:brightness-105',
};

const BASE =
  'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2';

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className, children, ...rest } = props;
  const cls = cn(BASE, SIZE_CLS[size], VARIANT_CLS[variant], className);

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </>
  );

  if ('href' in props && props.href) {
    const { href: _href, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link href={props.href} className={cls} {...anchorRest}>
        {content}
      </Link>
    );
  }

  const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} disabled={loading || buttonRest.disabled} aria-busy={loading || undefined} {...buttonRest}>
      {content}
    </button>
  );
}
