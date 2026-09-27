import { Facebook, Globe, Instagram, Linkedin } from 'lucide-react';
import { parseHttpsUrl } from './validators';

export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu_usuario', icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/tu_usuario', icon: Linkedin },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu_usuario', icon: Facebook },
  { key: 'website', label: 'Otro enlace (sitio, X, TikTok...)', placeholder: 'https://...', icon: Globe },
] as const;

type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]['key'];
export type SocialLinks = Partial<Record<SocialPlatformKey, string>>;

/** Valida un mapa de redes: cada valor presente debe ser una URL https; los vacíos se descartan. */
export function parseSocialLinks(value: unknown): SocialLinks | null {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;

  const result: SocialLinks = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SOCIAL_PLATFORMS.some((p) => p.key === key)) return null;
    if (raw === undefined || raw === null || raw === '') continue;
    const url = parseHttpsUrl(raw);
    if (!url) return null;
    result[key as SocialPlatformKey] = url;
  }
  return result;
}

/** Lee las redes guardadas (columna JSON) de forma segura, ignorando cualquier dato inesperado. */
export function readSocialLinks(value: unknown): SocialLinks {
  return parseSocialLinks(value) ?? {};
}
