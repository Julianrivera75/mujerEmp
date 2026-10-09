/**
 * Qué debe entregar la estudiante en una tarea. Lo define la mentora al crearla; el servidor y la pantalla de entrega
 * aplican exactamente las mismas reglas (este archivo lo usan los dos).
 */

export const DELIVERY_TYPES = ['FILE', 'LINK', 'TEXT', 'FILE_OR_LINK', 'ANY'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

/** Largo mínimo del texto cuando la entrega es solo escrita. */
export const TEXT_MIN_LENGTH = 20;
export const NOTES_MAX_LENGTH = 5000;
export const SUBMISSION_FILE_LIMIT = 'PDF o imagen (JPG, PNG o WebP) de hasta 15 MB';

export const DELIVERY_OPTIONS: { value: DeliveryType; label: string; help: string }[] = [
  { value: 'FILE', label: 'Un archivo', help: `${SUBMISSION_FILE_LIMIT}. Un solo archivo.` },
  { value: 'LINK', label: 'Un enlace', help: 'Un enlace que empiece por https:// (Drive, Docs, Canva, YouTube...).' },
  {
    value: 'TEXT',
    label: 'Texto escrito en la plataforma',
    help: `Escribe su respuesta aquí, sin archivo ni enlace (mínimo ${TEXT_MIN_LENGTH} caracteres).`,
  },
  { value: 'FILE_OR_LINK', label: 'Un archivo o un enlace', help: 'Ella elige: sube un archivo o pega un enlace.' },
  { value: 'ANY', label: 'Lo que prefiera', help: 'Texto, archivo o enlace: con uno de los tres basta.' },
];

export interface DeliveryConfig {
  deliveryType: DeliveryType;
  notesRequired: boolean;
}

export interface DeliveryInput {
  notes: string | null;
  /** Clave de un archivo ya subido (entregas PDF o imagen). */
  fileKey: string | null;
  /** Enlace https ya validado. */
  link: string | null;
}

/** Qué campos muestra la pantalla de entrega para cada tipo. */
export function deliveryFields(type: DeliveryType) {
  return {
    file: type === 'FILE' || type === 'FILE_OR_LINK' || type === 'ANY',
    link: type === 'LINK' || type === 'FILE_OR_LINK' || type === 'ANY',
    text: type === 'TEXT' || type === 'ANY',
  };
}

/** Frase para mostrar lo que se pide: "Un archivo (PDF o imagen), más un comentario". */
export function describeDelivery({ deliveryType, notesRequired }: DeliveryConfig): string {
  const base: Record<DeliveryType, string> = {
    FILE: 'un archivo (PDF o imagen)',
    LINK: 'un enlace (https://...)',
    TEXT: 'un texto escrito en la plataforma',
    FILE_OR_LINK: 'un archivo (PDF o imagen) o un enlace',
    ANY: 'un texto, un archivo o un enlace',
  };
  const extra = deliveryType !== 'TEXT' && notesRequired ? ', más un comentario o reflexión' : '';
  return `${base[deliveryType]}${extra}`;
}

/** Mensaje de error si lo entregado no cumple lo que pide la tarea, o null si cumple. */
export function validateDelivery(config: DeliveryConfig, input: DeliveryInput): string | null {
  const notes = (input.notes ?? '').trim();
  const hasFile = Boolean(input.fileKey);
  const hasLink = Boolean(input.link);
  const { deliveryType: type } = config;

  switch (type) {
    case 'FILE':
      if (hasLink) return 'Esta tarea pide un archivo, no un enlace.';
      if (!hasFile) return 'Sube un PDF o una imagen de tu trabajo.';
      break;
    case 'LINK':
      if (hasFile) return 'Esta tarea pide un enlace, no un archivo.';
      if (!hasLink) return 'Pega un enlace que empiece por https://';
      break;
    case 'TEXT':
      if (hasFile || hasLink) return 'Esta tarea se responde con texto escrito, sin archivo ni enlace.';
      if (notes.length < TEXT_MIN_LENGTH) return `Escribe tu respuesta (mínimo ${TEXT_MIN_LENGTH} caracteres).`;
      return null;
    case 'FILE_OR_LINK':
      if (hasFile && hasLink) return 'Entrega un archivo o un enlace, no los dos.';
      if (!hasFile && !hasLink) return 'Sube un PDF o una imagen, o pega un enlace.';
      break;
    case 'ANY':
      if (hasFile && hasLink) return 'Entrega un archivo o un enlace, no los dos.';
      if (!hasFile && !hasLink && notes.length < TEXT_MIN_LENGTH) {
        return `Escribe tu respuesta (mínimo ${TEXT_MIN_LENGTH} caracteres), sube un archivo o pega un enlace.`;
      }
      break;
  }

  if (config.notesRequired && notes.length === 0) return 'Escribe también un comentario o reflexión: la tarea lo pide.';
  return null;
}

/** Una entrega es tardía si llegó después de la fecha límite. */
export function isLateSubmission(submittedAt: string | Date, dueDate: string | Date): boolean {
  return new Date(submittedAt).getTime() > new Date(dueDate).getTime();
}

export type TaskStatus = 'ACTIVE' | 'DUE_SOON' | 'OVERDUE';

/** Estado de una tarea según su fecha límite: activa, vence en menos de 48 horas, o vencida. */
export function taskStatus(dueDate: string | Date, now = new Date()): TaskStatus {
  const diff = new Date(dueDate).getTime() - now.getTime();
  if (diff < 0) return 'OVERDUE';
  return diff <= 48 * 3600 * 1000 ? 'DUE_SOON' : 'ACTIVE';
}
