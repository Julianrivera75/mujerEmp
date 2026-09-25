'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { logClientError } from '@/lib/client-log';

type UploadCategory = 'submission' | 'resource' | 'avatar' | 'certificate';

interface FileUploadProps {
  category: UploadCategory;
  accept: string;
  /** Se llama con el "key" de S3 una vez subido el archivo. */
  onUploaded: (key: string, fileName: string) => void;
  label?: string;
}

export default function FileUpload({ category, accept, onUploaded, label }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Libera la vista previa al cambiar de archivo o al cerrar el componente.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || 'No se pudo preparar la subida.');
        return;
      }

      const putRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) {
        setError('Error al subir el archivo. Intentá de nuevo.');
        return;
      }

      setUploadedName(file.name);
      setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
      onUploaded(presignData.key, file.name);
    } catch (err) {
      logClientError('Error al subir archivo:', err);
      setError('Error de red al subir el archivo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={`file-upload-${category}`}
      />
      <label
        htmlFor={`file-upload-${category}`}
        className="flex cursor-pointer items-center justify-center space-x-2 rounded-xl border-2 border-dashed border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-600"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Subiendo...</span>
          </>
        ) : uploadedName ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="truncate">{uploadedName}</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            <span>{label || 'Subir archivo'}</span>
          </>
        )}
      </label>
      {previewUrl && (
        // Vista previa local (blob) de la foto que la estudiante acaba de subir.
        <img
          src={previewUrl}
          alt="Vista previa de tu archivo"
          className="mt-2 max-h-40 rounded-xl border border-slate-200"
        />
      )}
      {error && (
        <p className="mt-1.5 flex items-center space-x-1 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
