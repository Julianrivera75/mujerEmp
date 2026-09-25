import { describe, expect, it } from 'vitest';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/youtube';

const ID = 'dQw4w9WgXcQ';

describe('extractYouTubeId', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}?t=5`],
    [`youtu.be/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube.com/live/${ID}`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [ID],
  ])('extrae el identificador de %s', (input) => {
    expect(extractYouTubeId(input)).toBe(ID);
  });

  it.each([
    [`javascript:alert(1)//embed/${ID}`],
    [`https://evil.com/embed/${ID}`],
    [`http://www.youtube.com/watch?v=${ID}`],
    ['data:text/html,<script>alert(1)</script>'],
    ['https://youtu.be/"><script>'],
    ['https://www.youtube.com/watch?v=corto'],
    [''],
  ])('rechaza %s', (input) => {
    expect(extractYouTubeId(input)).toBeNull();
  });

  it('rechaza null y undefined', () => {
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
  });
});

describe('urls derivadas', () => {
  it('usa youtube-nocookie para incrustar y youtube.com para ver', () => {
    expect(getYouTubeEmbedUrl(`https://youtu.be/${ID}`)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
    expect(getYouTubeWatchUrl(`https://youtu.be/${ID}`)).toBe(`https://www.youtube.com/watch?v=${ID}`);
    expect(getYouTubeEmbedUrl('https://evil.com/x')).toBeNull();
    expect(getYouTubeWatchUrl(null)).toBeNull();
  });
});
