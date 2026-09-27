import React from 'react';
import { cn } from '@/lib/cn';

interface PresenceDotProps {
  online: boolean;
  /** Texto de presencia ("En línea", "Activa hace 15 min"); si es null no se muestra nada. */
  label: string | null;
  /** Muestra solo el punto (sin texto) para listas compactas. */
  dotOnly?: boolean;
  className?: string;
}

/** Indicador de presencia: punto verde si está en línea y gris si no, junto con el texto. */
export function PresenceDot({ online, label, dotOnly, className }: PresenceDotProps) {
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        online ? 'text-emerald-700' : 'text-slate-500',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full',
          online ? 'bg-emerald-500' : 'bg-slate-300',
        )}
      />
      {dotOnly ? <span className="sr-only">{label}</span> : <span className="font-semibold">{label}</span>}
    </span>
  );
}
