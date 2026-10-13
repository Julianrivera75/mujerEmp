import React from 'react';
import { highlightSegments } from '@/lib/text-search';

/** Texto con lo que se escribió en la búsqueda resaltado (sin importar tildes ni mayúsculas). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((segment, i) =>
        segment.match ? (
          <mark key={i} className="rounded bg-role-soft px-0.5 font-bold text-role-ink">
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}
