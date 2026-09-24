import React from 'react';
import { cn } from '@/lib/cn';

interface LogoProps {
  variant?: 'default' | 'compact' | 'mark-only';
  tone?: 'brand' | 'white';
  className?: string;
}

/** Monograma "E" enlazado en un anillo + wordmark. Único lugar con texto en degradado. */
export function Logo({ variant = 'default', tone = 'brand', className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="flex-shrink-0">
        <defs>
          <linearGradient id="logo-grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D946EF" />
            <stop offset="0.5" stopColor="#9333EA" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="37" height="37" rx="13" fill="url(#logo-grad)" />
        <path
          d="M14 12.5h13a1 1 0 0 1 0 2H16a1 1 0 0 0-1 1v3.5h9.5a1 1 0 1 1 0 2H15V25a1 1 0 0 0 1 1h11a1 1 0 1 1 0 2H14a3 3 0 0 1-3-3V15.5a3 3 0 0 1 3-3Z"
          fill="white"
        />
        <circle cx="27.5" cy="27.5" r="2.25" fill="white" />
      </svg>
      {variant !== 'mark-only' && (
        <div className="leading-tight">
          <span
            className={cn(
              'font-display font-bold tracking-tight',
              variant === 'compact' ? 'text-base' : 'text-xl',
              tone === 'white'
                ? 'text-white'
                : 'bg-gradient-to-r from-fuchsia-600 via-purple-700 to-indigo-800 bg-clip-text text-transparent',
            )}
          >
            Empoderas Diversas
          </span>
          {variant === 'default' && (
            <span
              className={cn(
                'block text-[11px] font-semibold uppercase tracking-wider',
                tone === 'white' ? 'text-white/70' : 'text-purple-700',
              )}
            >
              Plataforma de Capacitación
            </span>
          )}
        </div>
      )}
    </div>
  );
}
