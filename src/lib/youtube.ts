const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extrae el ID de un video de YouTube. Solo acepta URLs https de dominios de YouTube
 * (watch, youtu.be, embed, live, shorts) o el ID directo de 11 caracteres.
 */
export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (VIDEO_ID.test(trimmed)) return trimmed;

  // Se tolera la URL sin esquema ("youtu.be/xyz") pero nunca otro esquema (javascript:, data:, http:).
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(?:embed|live|shorts)\/([^/?#]+)/);
      id = match ? match[1] : null;
    }
  }

  return id && VIDEO_ID.test(id) ? id : null;
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function getYouTubeWatchUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
