'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

interface ClassPosterProps {
  /** URL firmada del afiche; si no hay afiche no se muestra nada. */
  url?: string | null;
  title: string;
  className?: string;
}

/** Medida recomendada del afiche, que se muestra en el formulario de la clase. */
export const POSTER_RECOMMENDATION = 'Recomendado: imagen horizontal de 1280 × 720 px (16:9), JPG o PNG de hasta 5 MB.';

/**
 * Afiche o imagen de una clase con una medida estándar (16:9) sin importar la forma de la imagen original:
 * se muestra completa, sin recortes, sobre un fondo difuminado de sí misma. Al pulsarla se abre a tamaño grande.
 */
export function ClassPoster({ url, title, className }: ClassPosterProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Si la imagen ya cargó antes de que React tomara el control (por ejemplo, desde la caché), onLoad no se dispara.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [url]);

  if (!url || failed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver el afiche de la clase ${title} en grande`}
        className={cn(
          'group relative block aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 text-left',
          !loaded && 'animate-pulse',
          className,
        )}
      >
        {/* Fondo: la misma imagen, ampliada y difuminada, para rellenar el marco cuando no es 16:9. */}
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
        />
        <img
          ref={imgRef}
          src={url}
          alt={`Afiche de la clase ${title}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'relative h-full w-full object-contain transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-900/60 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="h-3 w-3" />
          <span>Ampliar</span>
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="xl">
        <img
          src={url}
          alt={`Afiche de la clase ${title}`}
          className="mx-auto max-h-[75vh] w-auto max-w-full rounded-xl"
        />
      </Modal>
    </>
  );
}
