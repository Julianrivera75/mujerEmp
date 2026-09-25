'use client';

import React from 'react';
import { getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/youtube';
import { Video, ExternalLink } from 'lucide-react';

interface YouTubeEmbedProps {
  url: string | null | undefined;
  title?: string;
  notes?: string | null;
}

export default function YouTubeEmbed({ url, title = 'Clase Grabada', notes }: YouTubeEmbedProps) {
  const embedUrl = getYouTubeEmbedUrl(url);
  const watchUrl = getYouTubeWatchUrl(url);

  if (!embedUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-8 text-center text-slate-500">
        <Video className="mx-auto mb-2 h-12 w-12 text-slate-500" />
        <p className="font-medium">Aún no se ha cargado el enlace de grabación en YouTube para esta clase.</p>
        <p className="mt-1 text-xs text-slate-500">
          El docente o la administradora lo publicarán una vez finalizada la sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl transition-all hover:shadow-2xl">
      {/* Contenedor del video con aspecto 16:9 responsivo */}
      <div className="relative w-full bg-black pb-[56.25%]">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute left-0 top-0 h-full w-full border-0"
        />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Ver en YouTube</span>
            </a>
          )}
        </div>
        {notes && (
          <p className="mt-2 rounded-xl border border-purple-100/70 bg-purple-50/60 p-3 text-sm text-slate-600">
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}
