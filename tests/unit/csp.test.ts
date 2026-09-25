import { describe, expect, it } from 'vitest';
import { buildCsp, generateNonce } from '@/lib/csp';

describe('buildCsp', () => {
  it('los scripts solo se permiten con el nonce de la solicitud', () => {
    const csp = buildCsp('abc123', true);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('en desarrollo permite eval y no fuerza https', () => {
    const csp = buildCsp('abc123', false);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('cada nonce es distinto', () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});
