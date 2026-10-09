'use client';

import React from 'react';
import { FileText, Flag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { formatFileSize } from '@/lib/upload';

export interface MessageAttachment {
  name: string | null;
  type: string | null;
  size: number | null;
  url: string | null;
}

export interface MessageItem {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  attachment?: MessageAttachment | null;
}

interface MessageBubbleProps {
  message: MessageItem;
  onReport: (messageId: string) => void;
}

/** Un mensaje del hilo: texto, archivo adjunto (imagen o PDF) y, en los recibidos, el botón para reportarlo. */
export function MessageBubble({ message: m, onReport }: MessageBubbleProps) {
  const date = new Date(m.createdAt);
  const file = m.attachment;
  const isImage = Boolean(file?.type?.startsWith('image/'));

  return (
    <div className={cn('group flex items-end gap-1', m.mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
          m.mine
            ? 'rounded-br-md bg-gradient-to-r from-role-from to-role-to text-white'
            : 'rounded-bl-md bg-slate-100 text-slate-800',
        )}
      >
        {file &&
          (file.url ? (
            isImage ? (
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="mb-1 block">
                {/* Foto adjunta (dirección firmada y temporal). */}
                <img
                  src={file.url}
                  alt={file.name ?? 'Imagen adjunta'}
                  loading="lazy"
                  className="max-h-56 w-auto max-w-full rounded-xl"
                />
              </a>
            ) : (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'mb-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold underline-offset-2 hover:underline',
                  m.mine ? 'bg-white/20 text-white' : 'bg-white text-role-ink',
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                {file.size ? <span className="flex-shrink-0 opacity-80">{formatFileSize(file.size)}</span> : null}
              </a>
            )
          ) : (
            <span className="mb-1 block text-xs italic opacity-80">Archivo no disponible: {file.name}</span>
          ))}
        {m.body}
        <span className={cn('mt-0.5 block text-right text-[10px]', m.mine ? 'text-white/80' : 'text-slate-500')}>
          {formatTime(date)}
        </span>
      </div>
      {!m.mine && (
        <button
          type="button"
          onClick={() => onReport(m.id)}
          aria-label="Reportar este mensaje"
          title="Reportar este mensaje"
          className="tap-target rounded-full p-1.5 text-slate-400 opacity-60 transition-opacity hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
