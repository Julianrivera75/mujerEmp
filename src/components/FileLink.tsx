'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { safeHref } from '@/lib/validators';

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

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/upload?key=${encodeURIComponent(fileUrl)}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noreferrer');
      }
    } catch (err) {
      console.error('Error al obtener el archivo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <a href="#" onClick={handleClick} className={className}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : children}
    </a>
  );
}
