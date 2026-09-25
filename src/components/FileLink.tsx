'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { safeHref } from '@/lib/validators';
import { logClientError } from '@/lib/client-log';

interface FileLinkProps {
  /** URL externa, o key de S3 cuando isStoredFile es true. */
  fileUrl: string;
  /** true si fileUrl es un key de nuestro bucket S3 (requiere pedir URL firmada); false si es una URL externa directa. */
  isStoredFile: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Enlace que abre un archivo: directo si es una URL externa, o pide una URL firmada si es un archivo en S3. */
export default function FileLink({ fileUrl, isStoredFile, className, children }: FileLinkProps) {
  const [loading, setLoading] = useState(false);

  if (!isStoredFile) {
    return (
      <a href={safeHref(fileUrl)} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/upload?key=${encodeURIComponent(fileUrl)}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noreferrer');
      }
    } catch (err) {
      logClientError('Error al obtener el archivo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {loading ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
