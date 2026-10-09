'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { logClientError } from '@/lib/client-log';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_MB,
  ATTACHMENT_TYPES_LABEL,
  contentTypeOf,
} from '@/lib/file-types';
import { formatFileSize, uploadWithProgress, type UploadHandle } from '@/lib/upload';

export interface UploadedFile {
  /** Clave del archivo en el almacenamiento (la que se guarda al enviar el formulario). */
  key: string;
  name: string;
  size?: number;
}

interface FileDropZoneProps {
  category: 'submission' | 'assignment';
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  /** Cuántos archivos se aceptan como máximo. */
  maxFiles?: number;
  /** Avisa si hay una subida en curso (para bloquear el envío del formulario mientras tanto). */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  /** Texto del botón; por defecto "Elegir archivo(s)". */
  buttonLabel?: string;
  inputId: string;
}

interface Pending {
  id: number;
  name: string;
  size: number;
  percent: number;
}

/**
 * Zona para arrastrar y soltar archivos (o elegirlos con el botón). Valida tipo y tamaño antes de subir, sube con
 * barra de progreso directo al almacenamiento y entrega la lista de archivos ya subidos.
 */
export function FileDropZone({
  category,
  value,
  onChange,
  maxFiles = 1,
  onBusyChange,
  disabled,
  buttonLabel,
  inputId,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handles = useRef(new Map<number, UploadHandle>());
  const idRef = useRef(0);
  // La lista más reciente de archivos subidos, para que varias subidas a la vez no se pisen.
  const valueRef = useRef(value);
  valueRef.current = value;
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const busy = pending.length > 0;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Si se cierra el formulario a mitad de una subida, se cancela.
  useEffect(() => {
    const running = handles.current;
    return () => running.forEach((h) => h.abort());
  }, []);

  const full = value.length + pending.length >= maxFiles;

  const uploadOne = useCallback(
    async (file: File, contentType: string) => {
      const id = ++idRef.current;
      setPending((prev) => [...prev, { id, name: file.name, size: file.size, percent: 0 }]);
      try {
        const presign = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, fileName: file.name, contentType, sizeBytes: file.size }),
        });
        const data = await presign.json().catch(() => ({}));
        if (!presign.ok) {
          setErrors((prev) => [...prev, `"${file.name}": ${data.error || 'No se pudo preparar la subida.'}`]);
          return;
        }
        const handle = uploadWithProgress(
          data.uploadUrl,
          file,
          (percent) => setPending((prev) => prev.map((p) => (p.id === id ? { ...p, percent } : p))),
          contentType,
        );
        handles.current.set(id, handle);
        await handle.promise;
        onChange([...valueRef.current, { key: data.key, name: file.name, size: file.size }]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        logClientError('Error al subir archivo:', err);
        setErrors((prev) => [...prev, `"${file.name}": no se pudo subir. Revisa tu conexión e inténtalo de nuevo.`]);
      } finally {
        handles.current.delete(id);
        setPending((prev) => prev.filter((p) => p.id !== id));
      }
    },
    [category, onChange],
  );

  const accept = (files: File[]) => {
    const found: string[] = [];
    let room = maxFiles - valueRef.current.length - pending.length;
    for (const file of files) {
      const contentType = contentTypeOf(file);
      if (!contentType) {
        found.push(`"${file.name}": ese tipo de archivo no está permitido. Usa ${ATTACHMENT_TYPES_LABEL}.`);
      } else if (file.size > ATTACHMENT_MAX_BYTES) {
        found.push(`"${file.name}": pesa ${formatFileSize(file.size)} y el máximo es ${ATTACHMENT_MAX_MB} MB.`);
      } else if (file.size === 0) {
        found.push(`"${file.name}": el archivo está vacío.`);
      } else if (room <= 0) {
        found.push(
          maxFiles === 1
            ? 'Solo se puede subir un archivo: quita el actual para cambiarlo.'
            : `Solo puedes subir hasta ${maxFiles} archivos.`,
        );
        break;
      } else {
        room -= 1;
        void uploadOne(file, contentType);
      }
    }
    setErrors(found);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(Array.from(e.dataTransfer.files));
  };

  const remove = (key: string) => onChange(valueRef.current.filter((f) => f.key !== key));

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors',
          dragging ? 'border-role-accent bg-role-soft' : 'border-slate-300 bg-slate-50/60',
          (disabled || full) && 'opacity-60',
        )}
      >
        <UploadCloud className={cn('h-7 w-7', dragging ? 'text-role-ink' : 'text-slate-400')} aria-hidden="true" />
        <p className="text-sm font-bold text-slate-700">
          {dragging
            ? 'Suelta aquí para subir'
            : maxFiles === 1
              ? 'Arrastra un archivo aquí'
              : `Arrastra hasta ${maxFiles} archivos aquí`}
        </p>
        <p className="text-xs text-slate-500">
          {ATTACHMENT_TYPES_LABEL}, de hasta {ATTACHMENT_MAX_MB} MB.
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple={maxFiles > 1}
          disabled={disabled || full}
          className="hidden"
          onChange={(e) => {
            accept(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'mt-1 inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-role-accent hover:text-role-ink',
            (disabled || full) && 'pointer-events-none',
          )}
        >
          {full
            ? maxFiles === 1
              ? 'Archivo subido'
              : 'Máximo de archivos alcanzado'
            : (buttonLabel ?? (maxFiles === 1 ? 'Elegir archivo' : 'Elegir archivos'))}
        </label>
      </div>

      {(value.length > 0 || pending.length > 0) && (
        <ul className="space-y-1.5" aria-label="Archivos">
          {value.map((f) => (
            <li
              key={f.key}
              className="flex items-center gap-2 rounded-xl bg-role-soft px-3 py-2 text-xs font-semibold text-role-ink"
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              {f.size ? <span className="flex-shrink-0 text-slate-500">{formatFileSize(f.size)}</span> : null}
              <button
                type="button"
                onClick={() => remove(f.key)}
                disabled={disabled}
                aria-label={`Quitar ${f.name}`}
                className="flex-shrink-0 rounded-full p-1 hover:bg-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="space-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="flex-shrink-0 text-slate-500">Subiendo {p.percent}%</span>
                <button
                  type="button"
                  onClick={() => handles.current.get(p.id)?.abort()}
                  className="flex-shrink-0 font-bold text-slate-600 hover:text-red-600"
                >
                  Cancelar
                </button>
              </div>
              <div
                role="progressbar"
                aria-valuenow={p.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Subiendo ${p.name}`}
                className="h-1.5 overflow-hidden rounded-full bg-slate-100"
              >
                <div className="h-full rounded-full bg-role-accent transition-all" style={{ width: `${p.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-rose-600">
          {errors.map((message, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
