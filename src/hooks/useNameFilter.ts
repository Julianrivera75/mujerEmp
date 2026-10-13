'use client';

import { useMemo, useRef, useState } from 'react';
import { rankMatches } from '@/lib/text-search';

/**
 * Búsqueda por nombre sobre una lista que ya está cargada. Sin texto devuelve la lista tal cual; con texto, solo lo
 * que se parece, ordenado de lo más parecido a lo menos. `getTexts` devuelve los textos donde buscar (el primero es
 * el nombre, que pesa más).
 */
export function useNameFilter<T>(items: readonly T[], getTexts: (item: T) => string[]) {
  const [query, setQuery] = useState('');
  const getTextsRef = useRef(getTexts);
  getTextsRef.current = getTexts;

  const results = useMemo(
    () => rankMatches(items, query, (item) => getTextsRef.current(item)).map((r) => r.item),
    [items, query],
  );
  return { query, setQuery, results, isFiltering: query.trim().length > 0 };
}
