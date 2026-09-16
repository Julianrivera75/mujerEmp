'use client';

import React, { useEffect, useState } from 'react';

interface AvatarImageProps {
  /** Key de S3 (prefijo "avatares/"), o null/undefined si no hay avatar. */
  avatarKey: string | null | undefined;
  fallbackInitial: string;
  className?: string;
}

/** Muestra el avatar real del usuario (resolviendo su URL firmada) o sus iniciales si no tiene. */
export default function AvatarImage({ avatarKey, fallbackInitial, className }: AvatarImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!avatarKey) {
      setUrl(null);
      return;
    }
    fetch(`/api/upload?key=${encodeURIComponent(avatarKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.url) setUrl(data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [avatarKey]);

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Foto de perfil" className={`object-cover ${className || ''}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center font-black bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 text-white ${className || ''}`}
    >
      {fallbackInitial}
    </div>
  );
}
