/** Política de seguridad de contenido con nonce por solicitud (sin 'unsafe-inline' en scripts). */
export function buildCsp(nonce: string, isProd: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    // 'self' blob: porque Chrome procesa el <embed> de PDF como si fuera un frame (no basta con object-src).
    "frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    // 'self' blob: para permitir el <embed> del PDF del certificado (generado como blob: en el cliente).
    "object-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}
