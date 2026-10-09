/**
 * Qué debe entregar la estudiante en una tarea. La mentora elige, para cada tipo (archivo, enlace, texto), si no se
 * pide, es opcional u obligatorio; el servidor y la pantalla de entrega aplican exactamente las mismas reglas
 * (este archivo lo usan los dos).
 */

import { nameFromKey } from './file-types';

export const REQUIREMENTS = ['NONE', 'OPTIONAL', 'REQUIRED'] as const;
export type Requirement = (typeof REQUIREMENTS)[number];

/** Forma antigua (un solo tipo de entrega). Se conserva para traducir lo que envíe una pestaña abierta antes del cambio. */
export const DELIVERY_TYPES = ['FILE', 'LINK', 'TEXT', 'FILE_OR_LINK', 'ANY'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export interface DeliveryConfig {
  fileRequirement: Requirement;
  linkRequirement: Requirement;
  textRequirement: Requirement;
  /** Cuántos archivos se pueden subir como máximo (1 a 3). */
  maxFiles: number;
}

/** Largo mínimo del texto cuando la entrega es solo escrita. */
export const TEXT_MIN_LENGTH = 20;
export const NOTES_MAX_LENGTH = 5000;
export const MAX_FILES_LIMIT = 3;

/** Lo mismo que hacía la forma antigua (tipo de entrega + comentario obligatorio) con los requisitos nuevos. */
export function legacyRequirements(
  deliveryType: DeliveryType,
  notesRequired: boolean,
): Omit<DeliveryConfig, 'maxFiles'> {
  const text: Requirement = deliveryType === 'TEXT' || notesRequired ? 'REQUIRED' : 'OPTIONAL';
  switch (deliveryType) {
    case 'FILE':
      return { fileRequirement: 'REQUIRED', linkRequirement: 'NONE', textRequirement: text };
    case 'LINK':
      return { fileRequirement: 'NONE', linkRequirement: 'REQUIRED', textRequirement: text };
    case 'TEXT':
      return { fileRequirement: 'NONE', linkRequirement: 'NONE', textRequirement: 'REQUIRED' };
    default:
      return { fileRequirement: 'OPTIONAL', linkRequirement: 'OPTIONAL', textRequirement: text };
  }
}

/** Atajos del formulario de la mentora: rellenan las tres tarjetas de una vez. */
export const DELIVERY_PRESETS: { id: string; label: string; config: Omit<DeliveryConfig, 'maxFiles'> }[] = [
  {
    id: 'file',
    label: 'Solo archivo',
    config: { fileRequirement: 'REQUIRED', linkRequirement: 'NONE', textRequirement: 'OPTIONAL' },
  },
  {
    id: 'link',
    label: 'Solo enlace',
    config: { fileRequirement: 'NONE', linkRequirement: 'REQUIRED', textRequirement: 'OPTIONAL' },
  },
  {
    id: 'text',
    label: 'Solo texto',
    config: { fileRequirement: 'NONE', linkRequirement: 'NONE', textRequirement: 'REQUIRED' },
  },
  {
    id: 'file-or-link',
    label: 'Archivo o enlace (con uno basta)',
    config: { fileRequirement: 'OPTIONAL', linkRequirement: 'OPTIONAL', textRequirement: 'NONE' },
  },
  {
    id: 'text-file',
    label: 'Texto + archivo',
    config: { fileRequirement: 'REQUIRED', linkRequirement: 'NONE', textRequirement: 'REQUIRED' },
  },
  {
    id: 'any',
    label: 'Lo que prefiera (con uno basta)',
    config: { fileRequirement: 'OPTIONAL', linkRequirement: 'OPTIONAL', textRequirement: 'OPTIONAL' },
  },
];

export const hasDeliveryChoice = (
  config: Pick<DeliveryConfig, 'fileRequirement' | 'linkRequirement' | 'textRequirement'>,
) => config.fileRequirement !== 'NONE' || config.linkRequirement !== 'NONE' || config.textRequirement !== 'NONE';

/** Frase para mostrar lo que se pide, por ejemplo "un texto escrito y un archivo (hasta 3); también puede agregar un enlace". */
export function describeDelivery(config: DeliveryConfig): string {
  const names: Record<'file' | 'link' | 'text', string> = {
    file: config.maxFiles > 1 ? `archivos (hasta ${config.maxFiles})` : 'un archivo',
    link: 'un enlace (https://...)',
    text: 'un texto escrito',
  };
  const kinds = [
    { key: 'file' as const, requirement: config.fileRequirement },
    { key: 'link' as const, requirement: config.linkRequirement },
    { key: 'text' as const, requirement: config.textRequirement },
  ];
  const required = kinds.filter((k) => k.requirement === 'REQUIRED').map((k) => names[k.key]);
  const optional = kinds.filter((k) => k.requirement === 'OPTIONAL').map((k) => names[k.key]);
  const join = (items: string[], last: string) =>
    items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`;

  if (required.length === 0) {
    return optional.length === 0 ? 'nada' : `al menos una de estas opciones: ${join(optional, 'o')}`;
  }
  const base = join(required, 'y');
  return optional.length > 0 ? `${base}; también puede agregar ${join(optional, 'o')}` : base;
}

export interface DeliveryInput {
  notes: string | null;
  fileCount: number;
  /** Enlace https ya validado. */
  link: string | null;
}

/** Mensaje de error si lo entregado no cumple lo que pide la tarea, o null si cumple. */
export function validateDelivery(config: DeliveryConfig, input: DeliveryInput): string | null {
  const notes = (input.notes ?? '').trim();
  const hasFile = input.fileCount > 0;
  const hasLink = Boolean(input.link);
  const hasNotes = notes.length > 0;
  const textOnly = config.fileRequirement === 'NONE' && config.linkRequirement === 'NONE';
  const textMin = textOnly ? TEXT_MIN_LENGTH : 1;

  if (config.fileRequirement === 'NONE' && hasFile) return 'Esta tarea no recibe archivos.';
  if (config.linkRequirement === 'NONE' && hasLink) return 'Esta tarea no recibe enlaces.';
  if (config.textRequirement === 'NONE' && hasNotes) return 'Esta tarea no recibe texto escrito.';
  if (input.fileCount > config.maxFiles) {
    return config.maxFiles === 1
      ? 'Puedes entregar un solo archivo.'
      : `Puedes entregar hasta ${config.maxFiles} archivos.`;
  }

  if (config.fileRequirement === 'REQUIRED' && !hasFile) {
    return config.maxFiles === 1 ? 'Sube el archivo que pide la tarea.' : 'Sube al menos un archivo: la tarea lo pide.';
  }
  if (config.linkRequirement === 'REQUIRED' && !hasLink)
    return 'Pega el enlace que pide la tarea (empieza por https://).';
  if (config.textRequirement === 'REQUIRED' && notes.length < textMin) {
    return textOnly
      ? `Escribe tu respuesta (mínimo ${TEXT_MIN_LENGTH} caracteres).`
      : 'Escribe también el texto o comentario que pide la tarea.';
  }

  if (!hasFile && !hasLink && !hasNotes) {
    const accepted = [
      config.fileRequirement !== 'NONE' ? 'un archivo' : null,
      config.linkRequirement !== 'NONE' ? 'un enlace' : null,
      config.textRequirement !== 'NONE' ? 'un texto' : null,
    ].filter(Boolean);
    return `No has entregado nada: agrega ${accepted.join(', ').replace(/, ([^,]*)$/, ' o $1')}.`;
  }
  if (textOnly && hasNotes && notes.length < TEXT_MIN_LENGTH) {
    return `Escribe tu respuesta (mínimo ${TEXT_MIN_LENGTH} caracteres).`;
  }
  return null;
}

interface StoredSubmission {
  fileKeys?: string[] | null;
  fileNames?: string[] | null;
  fileUrl?: string | null;
  fileType?: string | null;
  linkUrl?: string | null;
}

export interface SubmissionFile {
  key: string;
  name: string;
}

/** Archivos de una entrega: los de la forma nueva (varios) o, en las anteriores, el único archivo subido. */
export function submissionFiles(sub: StoredSubmission): SubmissionFile[] {
  if (sub.fileKeys?.length) {
    return sub.fileKeys.map((key, i) => ({ key, name: sub.fileNames?.[i] || nameFromKey(key) }));
  }
  const legacyUpload = sub.fileType === 'PDF' || sub.fileType === 'IMAGE' || sub.fileType === 'DOC';
  return sub.fileUrl && legacyUpload ? [{ key: sub.fileUrl, name: nameFromKey(sub.fileUrl) }] : [];
}

/** Enlace de una entrega: el de la forma nueva o, en las anteriores, el que se guardaba como "LINK". */
export function submissionLink(sub: StoredSubmission): string | null {
  return sub.linkUrl ?? (sub.fileType === 'LINK' ? (sub.fileUrl ?? null) : null);
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
