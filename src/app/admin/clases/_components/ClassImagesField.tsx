'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { MAX_CLASS_IMAGES } from '@/lib/class-images';

export interface ClassImageItem {
  /** Clave del archivo en el almacenamiento. */
  key: string;
  /** Dirección para mostrarla (firmada o vista previa local). */
  url: string;
}

interface ClassImagesFieldProps {
  images: ClassImageItem[];
  onChange: (images: ClassImageItem[]) => void;
  onBusyChange?: (busy: boolean) => void;
}

/** Medida recomendada de las fotos, que se muestra en el formulario de la clase. */
const IMAGES_RECOMMENDATION = `Recomendado: imágenes horizontales de 1280 × 720 px (16:9), JPG, PNG o WebP de hasta 5 MB cada una. Puedes subir de 1 a ${MAX_CLASS_IMAGES}.`;

/**
 * Hasta tres fotos de la clase, con vista previa. Se publican juntas bajo el mismo enlace de la clase, en el orden
 * que se vea aquí (la primera es la principal).
 */
export function ClassImagesField({ images, onChange, onBusyChange }: ClassImagesFieldProps) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Fotos de la clase ({images.length} de {MAX_CLASS_IMAGES})
      </p>
      <p className="text-xs text-slate-500">
        {IMAGES_RECOMMENDATION} Si una foto es de otra forma, se muestra completa sobre un fondo difuminado.
      </p>

      {images.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.key} className="space-y-1.5">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {image.url ? (
                  // Vista previa: la foto ya subida (firmada) o el archivo local recién subido.
                  <img src={image.url} alt={`Foto ${index + 1} de la clase`} className="h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[11px] text-slate-500">
                    Sin vista previa
                  </span>
                )}
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mover la foto ${index + 1} a la izquierda`}
                    className="tap-target rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label={`Mover la foto ${index + 1} a la derecha`}
                    className="tap-target rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  className="tap-target flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Quitar</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length < MAX_CLASS_IMAGES && (
        <FileUpload
          category="classImage"
          resetOnUploaded
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          label={images.length === 0 ? 'Subir la primera foto' : 'Agregar otra foto'}
          onBusyChange={onBusyChange}
          onUploaded={(key, _name, file) => onChange([...images, { key, url: URL.createObjectURL(file) }])}
        />
      )}
    </div>
  );
}
