import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

interface LogoProps {
  /** `default` incluye la leyenda; `compact` es para la barra superior; `mark-only` muestra solo el logo. */
  variant?: 'default' | 'compact' | 'mark-only';
  /** `white` usa la versión clara del logo, para colocarlo directamente sobre fondos oscuros. */
  tone?: 'brand' | 'white';
  className?: string;
}

const HEIGHT = { default: 48, compact: 34, 'mark-only': 60 } as const;

/** Logo oficial de Empoderadas Diversas. */
export function Logo({ variant = 'default', tone = 'brand', className }: LogoProps) {
  const height = HEIGHT[variant];
  const image = (
    <Image
      src={tone === 'white' ? '/logos/empoderadas-diversas-claro.png' : '/logos/empoderadas-diversas.png'}
      alt="Empoderadas Diversas"
      width={640}
      height={154}
      priority
      style={{ height, width: 'auto' }}
    />
  );

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      {image}
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
