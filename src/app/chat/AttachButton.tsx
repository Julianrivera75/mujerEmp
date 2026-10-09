'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { logClientError } from '@/lib/client-log';
import { formatFileSize, uploadWithProgress, type UploadHandle } from '@/lib/upload';

export interface ChatAttachment {
  key: string;
  name: string;
  type: string;
  size: number;
}

interface AttachButtonProps {
  value: ChatAttachment | null;
  onChange: (attachment: ChatAttachment | null) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

/** Clip para adjuntar una imagen o un PDF al mensaje: se sube de inmediato y se muestra como una ficha que se puede quitar. */
export function AttachButton({ value, onChange, onError, disabled }: AttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<UploadHandle | null>(null);
  const [percent, setPercent] = useState<number | null>(null);

  // Si se cierra la conversación a mitad de la subida, se cancela.
  useEffect(() => () => handleRef.current?.abort(), []);

  const pick = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      onError('Adjunta una imagen JPG, PNG o WebP, o un PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      onError('El archivo supera los 10 MB.');
      return;
    }
    setPercent(0);
    try {
      const presign = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'chat', fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      const data = await presign.json();
      if (!presign.ok) {
        onError(data.error || 'No se pudo preparar la subida.');
        return;
      }
      handleRef.current = uploadWithProgress(data.uploadUrl, file, setPercent);
      await handleRef.current.promise;
      onChange({ key: data.key, name: file.name, type: file.type, size: file.size });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      logClientError('Error al subir el archivo del chat:', err);
      onError('No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      handleRef.current = null;
      setPercent(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (percent !== null) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl bg-role-soft px-3 py-2 text-xs font-semibold text-role-ink"
      >
        <span>Subiendo {percent}%</span>
        <button type="button" onClick={() => handleRef.current?.abort()} className="underline">
          Cancelar
        </button>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex max-w-[14rem] items-center gap-1.5 rounded-xl bg-role-soft px-2.5 py-2 text-xs font-semibold text-role-ink">
        <FileText className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{value.name}</span>
        <span className="flex-shrink-0 text-slate-500">{formatFileSize(value.size)}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Quitar el archivo adjunto"
          className="flex-shrink-0 rounded-full p-0.5 hover:bg-white/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        id="chat-attach"
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <label
        htmlFor="chat-attach"
        aria-label="Adjuntar una imagen o un PDF"
        className="tap-target flex cursor-pointer items-center justify-center rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-role-soft hover:text-role-ink"
      >
        <Paperclip className="h-5 w-5" />
      </label>
    </>
  );
}
