import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

interface LogoProps {
  /** `default` incluye la leyenda; `compact` es para la barra superior; `mark-only` muestra solo el logo. */
  variant?: 'default' | 'compact' | 'mark-only';
  /** `white` coloca el logo sobre una tarjeta blanca para usarlo encima de fondos oscuros. */
  tone?: 'brand' | 'white';
  className?: string;
}

const HEIGHT = { default: 48, compact: 34, 'mark-only': 60 } as const;

/** Logo oficial de Empoderadas Diversas. */
export function Logo({ variant = 'default', tone = 'brand', className }: LogoProps) {
  const height = HEIGHT[variant];
  const image = (
    <Image
      src="/logos/empoderadas-diversas.png"
      alt="Empoderadas Diversas"
      width={640}
      height={154}
      priority
      style={{ height, width: 'auto' }}
    />
  );

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      {tone === 'white' ? <span className="rounded-2xl bg-white px-5 py-3 shadow-lift">{image}</span> : image}
      {variant === 'default' && (
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider',
            tone === 'white' ? 'text-white/80' : 'text-purple-700',
          )}
        >
          Plataforma de Capacitación
        </span>
      )}
    </div>
  );
}
