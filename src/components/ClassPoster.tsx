import React from 'react';
import { cn } from '@/lib/cn';

interface ClassPosterProps {
  /** URL firmada del afiche; si no hay afiche no se muestra nada. */
  url?: string | null;
  title: string;
  className?: string;
}

/** Afiche o imagen de una clase. */
export function ClassPoster({ url, title, className }: ClassPosterProps) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt={`Afiche de la clase ${title}`}
      loading="lazy"
      className={cn('max-h-56 w-full rounded-2xl border border-slate-100 object-cover', className)}
    />
  );
}
