'use client';

import { useEffect, useState } from 'react';

/**
 * Elemento a resaltar según el parámetro de la URL (por ejemplo `?tarea=<id>` al llegar desde una notificación).
 * Cuando `ready` es true busca `#<prefijo>-<id>`, lo desplaza a la vista y devuelve el id para resaltarlo un momento.
 */
export function useHighlight(param: string, prefix: string, ready: boolean): string | null {
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const id = new URLSearchParams(window.location.search).get(param);
    if (!id) return;
    setHighlighted(id);
    document.getElementById(`${prefix}-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => setHighlighted(null), 4000);
    return () => window.clearTimeout(timer);
  }, [param, prefix, ready]);

  return highlighted;
}
