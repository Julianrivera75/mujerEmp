/** Versión vigente de los Términos y la Política de Tratamiento de Datos. Al cambiar los textos, subir la fecha: todas las usuarias deberán aceptarlos de nuevo. */
export const CURRENT_TERMS_VERSION = '2026-09-24';

/** Porcentaje mínimo de asistencia a las sesiones en vivo para obtener la constancia de participación. */
export const CERTIFICATE_MIN_ATTENDANCE_PERCENT = 80;

/** Datos del responsable del tratamiento. Reemplazar los marcadores antes de publicar. */
export const CONTROLLER = {
  legalName: '[RAZÓN SOCIAL]',
  taxId: '[NIT]',
  address: '[DIRECCIÓN Y CIUDAD]',
  email: '[CORREO PARA CONSULTAS Y RECLAMOS DE DATOS]',
  phone: '[TELÉFONO]',
} as const;
