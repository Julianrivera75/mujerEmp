/**
 * Tipos de archivo que se pueden adjuntar a una tarea (instrucciones) o entregar como trabajo. Lo usan la pantalla
 * (para validar antes de subir) y el servidor (lista de tipos permitidos).
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Tipos de contenido permitidos para instrucciones y entregas. */
export const ATTACHMENT_MIME_TYPES = Array.from(new Set(Object.values(MIME_BY_EXTENSION)));

/** Valor para el atributo `accept` del selector de archivos. */
export const ATTACHMENT_ACCEPT = [...Object.keys(MIME_BY_EXTENSION).map((e) => `.${e}`), ...ATTACHMENT_MIME_TYPES].join(
  ',',
);

export const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
export const ATTACHMENT_MAX_MB = 15;
export const ATTACHMENT_TYPES_LABEL = 'PDF, imagen (JPG, PNG, WebP), Word, PowerPoint o Excel';

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

/** Tipo de contenido según la extensión (los navegadores a veces no lo informan para Word o Excel). */
export function mimeFromName(name: string): string | null {
  return MIME_BY_EXTENSION[extensionOf(name)] ?? null;
}

/** Tipo de contenido de un archivo: el que informa el navegador si es permitido; si no, el de su extensión. */
export function contentTypeOf(file: { name: string; type: string }): string | null {
  if (file.type && ATTACHMENT_MIME_TYPES.includes(file.type)) return file.type;
  return mimeFromName(file.name);
}

export const isImageName = (name: string) => ['jpg', 'jpeg', 'png', 'webp'].includes(extensionOf(name));

/** Los PDF y las imágenes se abren en el navegador; los documentos de Office se descargan. */
export const opensInBrowser = (name: string) => isImageName(name) || extensionOf(name) === 'pdf';

/** Nombre para mostrar a partir de la clave del almacenamiento ("tareas/<id>/123-informe.pdf" → "informe.pdf"). */
export function nameFromKey(key: string): string {
  const last = key.split('/').pop() ?? key;
  return last.replace(/^\d+-/, '');
}
