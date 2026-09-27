'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Upload, X } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { logClientError } from '@/lib/client-log';
import { formatFileSize, uploadWithProgress, type UploadHandle } from '@/lib/upload';

type UploadCategory = 'submission' | 'resource' | 'avatar' | 'certificate' | 'classImage';

interface FileUploadProps {
  category: UploadCategory;
  accept: string;
  /** Se llama con el "key" de S3 una vez subido el archivo. */
  onUploaded: (key: string, fileName: string) => void;
  label?: string;
  /** Avisa si hay una subida en curso (para bloquear el envío del formulario mientras tanto). */
  onBusyChange?: (busy: boolean) => void;
}

type Phase = 'idle' | 'preparing' | 'uploading' | 'done';

export default function FileUpload({ category, accept, onUploaded, label, onBusyChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<UploadHandle | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const busy = phase === 'preparing' || phase === 'uploading';

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Libera la vista previa al cambiar de archivo o al cerrar el componente.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Si el componente se cierra a mitad de la subida, se cancela.
  useEffect(() => () => handleRef.current?.abort(), []);

  const upload = async (file: File) => {
    setError(null);
    setLastFile(file);
    setFileInfo({ name: file.name, size: file.size });
    setPercent(0);
    setPhase('preparing');
    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || 'No se pudo preparar la subida.');
        setPhase('idle');
        return;
      }

      setPhase('uploading');
      handleRef.current = uploadWithProgress(presignData.uploadUrl, file, setPercent);
      await handleRef.current.promise;

      setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
      setPhase('done');
      onUploaded(presignData.key, file.name);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setPhase('idle');
        setFileInfo(null);
        return;
      }
      logClientError('Error al subir archivo:', err);
      setError('No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.');
      setPhase('idle');
    } finally {
      handleRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  };

  const inputId = `file-upload-${category}`;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={inputId}
        disabled={busy}
      />

      {busy && fileInfo ? (
        <div
          role="status"
          aria-live="polite"
          className="space-y-2 rounded-xl border border-role-accent/20 bg-role-soft p-3 text-xs"
        >
          <div className="flex items-center justify-between gap-2 font-semibold text-slate-700">
            <span className="truncate">{fileInfo.name}</span>
            <span className="flex-shrink-0 text-slate-500">{formatFileSize(fileInfo.size)}</span>
          </div>
          <ProgressBar
            value={phase === 'preparing' ? 0 : percent}
            label={`Subiendo ${fileInfo.name}`}
            className="h-2"
            fast
          />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-role-ink">
              {phase === 'preparing' ? 'Preparando la subida...' : `Subiendo ${percent}%`}
            </span>
            <button
              type="button"
              onClick={() => handleRef.current?.abort()}
              className="flex items-center gap-1 font-semibold text-slate-600 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center justify-center space-x-2 rounded-xl border-2 border-dashed border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-fuchsia-400 hover:text-role-ink"
        >
          {phase === 'done' && fileInfo ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="truncate">{fileInfo.name}</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>{label || 'Subir archivo'}</span>
            </>
          )}
        </label>
      )}

      {previewUrl && phase === 'done' && (
        // Vista previa local (blob) de la imagen que se acaba de subir.
        <img
          src={previewUrl}
          alt="Vista previa de tu archivo"
          className="mt-2 max-h-40 rounded-xl border border-slate-200"
        />
      )}

      {error && (
        <div role="alert" className="mt-1.5 flex items-center justify-between gap-2 text-xs text-rose-600">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </span>
          {lastFile && (
            <button type="button" onClick={() => void upload(lastFile)} className="font-bold underline">
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
