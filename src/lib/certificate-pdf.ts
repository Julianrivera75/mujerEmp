import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CERTIFICATE_ART_SIZE, type CertificateLine, type CertificateModule } from './modules';

const TEXT_COLOR = rgb(0x5b / 255, 0x1a / 255, 0x6b / 255);
const FOOTER_COLOR = rgb(0.4, 0.4, 0.4);
const HORIZONTAL_PADDING = 10;
/** Franja bajo el arte original donde se imprime el código de verificación, fuera del diseño del certificado. */
const FOOTER_HEIGHT = 32;
const FOOTER_FONT_SIZE = 12;

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export interface GenerateCertificatePdfParams {
  module: Pick<CertificateModule, 'art' | 'name' | 'studentNumber'>;
  studentName: string;
  studentNumber: string;
  verificationCode: string;
  issuedAt: Date;
}

/** Tamaño de letra que cabe en el ancho de la línea, sin bajar del mínimo legible. */
function fitFontSize(font: Awaited<ReturnType<PDFDocument['embedFont']>>, text: string, maxWidth: number, start: number) {
  let fontSize = start;
  while (font.widthOfTextAtSize(text, fontSize) > maxWidth && fontSize > 16) fontSize -= 1;
  return fontSize;
}

/**
 * Genera el PDF del certificado: el arte oficial con el nombre y el número de estudiante estampados,
 * más el código de verificación y la fecha de emisión en una franja discreta al pie de la página.
 */
export async function generateCertificatePdf({
  module,
  studentName,
  studentNumber,
  verificationCode,
  issuedAt,
}: GenerateCertificatePdfParams): Promise<Uint8Array> {
  const imageBytes = await readFile(path.join(process.cwd(), 'public', module.art));

  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(imageBytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const footerFont = await pdf.embedFont(StandardFonts.Helvetica);

  const { width: artWidth, height: artHeight } = CERTIFICATE_ART_SIZE;
  const page = pdf.addPage([artWidth, artHeight + FOOTER_HEIGHT]);
  page.drawImage(image, { x: 0, y: FOOTER_HEIGHT, width: artWidth, height: artHeight });

  /** El origen del PDF es abajo-izquierda; `line.y` viene en coordenadas de arriba-izquierda (como en el Canvas). */
  const drawOnLine = (text: string, line: CertificateLine, baseSize: number) => {
    const maxWidth = line.x2 - line.x1 - HORIZONTAL_PADDING * 2;
    const size = fitFontSize(font, text, maxWidth, baseSize);
    page.drawText(text, {
      x: line.x1 + HORIZONTAL_PADDING,
      y: artHeight - line.y + FOOTER_HEIGHT,
      size,
      font,
      color: TEXT_COLOR,
    });
  };

  drawOnLine(studentName, module.name, 40);
  drawOnLine(studentNumber, module.studentNumber, 36);

  const footerText = `Código de verificación: ${verificationCode} · Emitido el ${DATE_FORMAT.format(issuedAt)}`;
  page.drawText(footerText, {
    x: HORIZONTAL_PADDING,
    y: FOOTER_HEIGHT / 2 - FOOTER_FONT_SIZE / 3,
    size: FOOTER_FONT_SIZE,
    font: footerFont,
    color: FOOTER_COLOR,
  });

  return pdf.save();
}
