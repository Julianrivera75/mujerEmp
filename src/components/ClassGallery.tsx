'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

interface ClassGalleryProps {
  /** URLs firmadas de las fotos de la clase, en orden; si no hay ninguna no se muestra nada. */
  urls: string[];
  title: string;
  className?: string;
}

interface TileProps {
  url: string;
  alt: string;
  onOpen: () => void;
  onFailed: () => void;
  className?: string;
}

/** Una foto con la medida estándar (16:9): se ve completa, sin recortes, sobre un fondo difuminado de sí misma. */
function Tile({ url, alt, onOpen, onFailed, className }: TileProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Si la imagen ya cargó antes de que React tomara el control (por ejemplo, desde la caché), onLoad no se dispara.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [url]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver en grande: ${alt}`}
      className={cn(
        'group relative block aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 text-left',
        !loaded && 'animate-pulse',
        className,
      )}
    >
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
      />
      <img
        ref={imgRef}
        src={url}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={onFailed}
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
  );
}

/**
 * Fotos de una clase (de una a tres). Una sola se ve como un afiche; dos o tres quedan alineadas en fila
 * y, en el celular, en un carrusel que se desliza. Al pulsar una foto se abre en grande, con anterior y siguiente.
 */
export function ClassGallery({ urls, title, className }: ClassGalleryProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const [current, setCurrent] = useState<number | null>(null);

  const shown = urls.filter((u) => !failed.includes(u));
  if (shown.length === 0) return null;

  const markFailed = (url: string) => setFailed((prev) => (prev.includes(url) ? prev : [...prev, url]));
  const step = (delta: number) => setCurrent((i) => (i === null ? i : (i + delta + shown.length) % shown.length));
  const many = shown.length > 1;
  const altOf = (i: number) => (many ? `Foto ${i + 1} de la clase ${title}` : `Afiche de la clase ${title}`);

  return (
    <>
      {many ? (
        <div
          className={cn(
            '-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0',
            shown.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
            className,
          )}
          aria-label={`Fotos de la clase ${title}`}
        >
          {shown.map((url, i) => (
            <div key={url} className="w-[85%] flex-shrink-0 snap-center sm:w-auto">
              <Tile url={url} alt={altOf(i)} onOpen={() => setCurrent(i)} onFailed={() => markFailed(url)} />
            </div>
          ))}
        </div>
      ) : (
        <Tile
          url={shown[0]}
          alt={altOf(0)}
          onOpen={() => setCurrent(0)}
          onFailed={() => markFailed(shown[0])}
          className={className}
        />
      )}

      <Modal open={current !== null} onClose={() => setCurrent(null)} title={title} size="xl">
        {current !== null && shown[current] && (
          <div className="relative">
            <img
              src={shown[current]}
              alt={altOf(current)}
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-xl"
            />
            {many && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Foto anterior"
                  className="tap-target absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/60 p-2 text-white hover:bg-slate-900/80"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Foto siguiente"
                  className="tap-target absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/60 p-2 text-white hover:bg-slate-900/80"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <p className="mt-2 text-center text-xs font-semibold text-slate-500">
                  {current + 1} de {shown.length}
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
