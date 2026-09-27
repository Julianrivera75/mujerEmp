/** Textos de campos que se repiten en varios formularios. */
export const PHONE_LABEL = 'Número de contacto (WhatsApp con indicativo internacional)';
export const PHONE_HINT = 'Incluye el código de tu país. Ej.: +1 305 555 0123';

const NUMBER_LABELS = {
  STUDENT: 'Número de estudiante',
  MENTOR: 'Número de mentor/a',
  ADMIN: 'Número de administrador/a',
} as const;

/** Etiqueta del número de identificación interno según el rol ("Número de {rol}"). Nunca CC ni otro tipo de documento. */
export const numberLabel = (role: keyof typeof NUMBER_LABELS) => NUMBER_LABELS[role];
