import { describe, expect, it } from 'vitest';
import { parseSocialLinks } from '@/lib/social-links';

describe('parseSocialLinks', () => {
  it('acepta vacío, ausente y un mapa con URLs https válidas', () => {
    expect(parseSocialLinks(undefined)).toEqual({});
    expect(parseSocialLinks(null)).toEqual({});
    expect(parseSocialLinks({})).toEqual({});
    expect(parseSocialLinks({ instagram: 'https://instagram.com/x', website: 'https://x.com' })).toEqual({
      instagram: 'https://instagram.com/x',
      website: 'https://x.com/', // la URL normalizada agrega la barra final
    });
  });

  it('descarta las claves con valor vacío', () => {
    expect(parseSocialLinks({ instagram: '', linkedin: 'https://linkedin.com/in/x' })).toEqual({
      linkedin: 'https://linkedin.com/in/x',
    });
  });

  it('rechaza una plataforma no reconocida, un valor que no sea texto o una URL no https', () => {
    expect(parseSocialLinks({ tiktok: 'https://tiktok.com/@x' })).toBeNull();
    expect(parseSocialLinks({ instagram: 'no-es-una-url' })).toBeNull();
    expect(parseSocialLinks({ instagram: 'http://instagram.com/x' })).toBeNull();
    expect(parseSocialLinks('texto')).toBeNull();
    expect(parseSocialLinks(['a'])).toBeNull();
  });
});
