/**
 * Extrae el ID de un video de YouTube a partir de diversas variantes de URL:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const trimmed = url.trim();
    // Caso youtu.be/VIDEO_ID
    if (trimmed.includes('youtu.be/')) {
      const id = trimmed.split('youtu.be/')[1]?.split(/[?&]/)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    // Caso youtube.com/watch?v=VIDEO_ID
    if (trimmed.includes('watch?v=')) {
      const id = trimmed.split('watch?v=')[1]?.split('&')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    // Caso youtube.com/live/VIDEO_ID
    if (trimmed.includes('/live/')) {
      const id = trimmed.split('/live/')[1]?.split(/[?&]/)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    // Caso ya sea embed
    if (trimmed.includes('/embed/')) {
      return trimmed;
    }

    // Si es solo el ID directamente (11 caracteres alfanuméricos)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return `https://www.youtube.com/embed/${trimmed}`;
    }

    return null;
  } catch {
    return null;
  }
}
