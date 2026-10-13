/**
 * Búsqueda por nombre que perdona tildes, mayúsculas y el orden de las palabras, y ordena por parecido.
 * La usan las listas de personas (cliente) y las búsquedas del chat (servidor).
 */

/** Minúsculas, sin tildes y con todo lo que no es letra o número convertido en espacio. Conserva el largo del texto. */
export function fold(value: string): string {
  let out = '';
  for (const ch of value) {
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const first = Array.from(base)[0] ?? ' ';
    out += /[\p{L}\p{N}]/u.test(first) ? first : ' ';
  }
  return out;
}

const tokensOf = (query: string) => fold(query).split(/\s+/).filter(Boolean);
const wordsOf = (folded: string) => folded.split(/\s+/).filter(Boolean);

/** Distancia de edición entre dos palabras cortas (tolera una letra de más, de menos o cambiada). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

/** Qué tan bien casa una palabra buscada con las palabras del texto: 0 empieza igual, 1 contiene, 2 se parece, null no casa. */
function tokenTier(token: string, words: string[], folded: string): 0 | 1 | 2 | null {
  if (words.some((w) => w.startsWith(token))) return 0;
  if (folded.includes(token)) return 1;
  // Una letra mal escrita ("mauro" por "maura"): solo desde 4 letras para no traer ruido.
  if (
    token.length >= 4 &&
    words.some((w) => w.length >= token.length - 1 && editDistance(token, w.slice(0, token.length)) <= 1)
  ) {
    return 2;
  }
  return null;
}

/** Puntaje de un texto frente a la búsqueda (menor es mejor), o null si no casa. */
export function scoreText(text: string, query: string): number | null {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return null;
  const folded = fold(text);
  const words = wordsOf(folded);
  const joined = words.join(' ');
  const wanted = tokens.join(' ');

  if (joined === wanted) return 0;
  if (joined.startsWith(wanted)) return 1;

  let worst = 0;
  for (const token of tokens) {
    const tier = tokenTier(token, words, folded);
    if (tier === null) return null;
    worst = Math.max(worst, tier);
  }
  // 2 = todas las palabras empiezan una palabra del texto (en cualquier orden), 3 = contiene, 4 = se parece.
  return 2 + worst;
}

export interface Ranked<T> {
  item: T;
  score: number;
}

/**
 * Filtra y ordena `items` por parecido con `query`. `getTexts` devuelve los textos donde buscar; el primero es el
 * principal (el nombre) y pesa más que los demás (correo, número...). Sin búsqueda devuelve todo en el orden dado.
 */
export function rankMatches<T>(items: readonly T[], query: string, getTexts: (item: T) => string[]): Ranked<T>[] {
  if (tokensOf(query).length === 0) return items.map((item) => ({ item, score: 0 }));
  const ranked: Ranked<T>[] = [];
  for (const item of items) {
    const [primary, ...others] = getTexts(item);
    const main = scoreText(primary ?? '', query);
    let best = main;
    if (best === null) {
      for (const text of others) {
        const s = scoreText(text, query);
        // Coincidir solo por el correo o el número vale menos que coincidir por el nombre.
        if (s !== null && (best === null || s + 10 < best)) best = s + 10;
      }
    }
    if (best !== null) ranked.push({ item, score: best });
  }
  return ranked
    .map((r, index) => ({ ...r, index, name: getTexts(r.item)[0] ?? '' }))
    .sort(
      (a, b) =>
        a.score - b.score || a.name.length - b.name.length || a.name.localeCompare(b.name, 'es') || a.index - b.index,
    )
    .map(({ item, score }) => ({ item, score }));
}

export interface Segment {
  text: string;
  match: boolean;
}

/** Parte un texto en tramos para resaltar lo que se escribió (sin tildes ni mayúsculas). */
export function highlightSegments(text: string, query: string): Segment[] {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return [{ text, match: false }];
  const chars = Array.from(text);
  const folded = Array.from(fold(text));
  const marked = new Array<boolean>(chars.length).fill(false);

  for (const token of tokens) {
    const target = Array.from(token);
    for (let i = 0; i + target.length <= folded.length; i++) {
      const startsWord = i === 0 || folded[i - 1] === ' ';
      if (!startsWord) continue;
      if (target.every((c, k) => folded[i + k] === c)) {
        for (let k = 0; k < target.length; k++) marked[i + k] = true;
        break;
      }
    }
  }

  const segments: Segment[] = [];
  chars.forEach((ch, i) => {
    const last = segments[segments.length - 1];
    if (last && last.match === marked[i]) last.text += ch;
    else segments.push({ text: ch, match: marked[i] });
  });
  return segments;
}
