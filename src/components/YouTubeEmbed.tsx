'use client';

import React from 'react';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { Video, ExternalLink } from 'lucide-react';

interface YouTubeEmbedProps {
  url: string | null | undefined;
  title?: string;
  notes?: string | null;
}

export default function YouTubeEmbed({ url, title = 'Clase Grabada', notes }: YouTubeEmbedProps) {
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
        <Video className="w-12 h-12 mx-auto text-slate-400 mb-2" />
        <p className="font-medium">Aún no se ha cargado el enlace de grabación en YouTube para esta clase.</p>
        <p className="text-xs text-slate-400 mt-1">El docente o la administradora lo publicarán una vez finalizada la sesión.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 transition-all hover:shadow-2xl">
      {/* Contenedor del video con aspecto 16:9 responsivo */}
      <div className="relative w-full pb-[56.25%] bg-black">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en YouTube</span>
            </a>
          )}
        </div>
        {notes && (
          <p className="mt-2 text-sm text-slate-600 bg-purple-50/60 p-3 rounded-xl border border-purple-100/70">
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}
