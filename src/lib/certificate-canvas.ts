import { CERTIFICATE_ART_SIZE, type CertificateLine, type CertificateModule } from './modules';

const TEXT_COLOR = '#5b1a6b';
const HORIZONTAL_PADDING = 10;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el arte del certificado.'));
    image.src = src;
  });
}

/** Escribe el texto sobre la línea en blanco, reduciendo la letra hasta que quepa. */
function drawOnLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  line: CertificateLine,
  fontFamily: string,
  size: number,
) {
  const maxWidth = line.x2 - line.x1 - HORIZONTAL_PADDING * 2;
  let fontSize = size;
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 16) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
  }
  ctx.fillText(text, line.x1 + HORIZONTAL_PADDING, line.y);
}

/**
 * Compone el certificado: el arte oficial con el nombre completo y el número de estudiante.
 * La fecha y el resto del diseño vienen impresos en el arte, por lo que no dependen de cuándo se descargue.
 */
export async function renderCertificate(
  module: Pick<CertificateModule, 'art' | 'name' | 'studentNumber'>,
  studentName: string,
  studentNumber: string,
): Promise<HTMLCanvasElement> {
  const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-body').trim() || 'sans-serif';
  const [image] = await Promise.all([
    loadImage(module.art),
    document.fonts?.load(`700 32px ${fontFamily}`).catch(() => []),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = CERTIFICATE_ART_SIZE.width;
  canvas.height = CERTIFICATE_ART_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite generar el certificado.');

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = 'alphabetic';
  drawOnLine(ctx, studentName, module.name, fontFamily, 40);
  drawOnLine(ctx, studentNumber, module.studentNumber, fontFamily, 36);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))), 'image/png');
  });
}
