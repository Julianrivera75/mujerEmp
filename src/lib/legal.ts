/** Versión vigente de los Términos y la Política de Tratamiento de Datos. Al cambiar los textos, subir la fecha: todas las usuarias deberán aceptarlos de nuevo. */
export const CURRENT_TERMS_VERSION = '2026-09-25';

/** Porcentaje mínimo de asistencia a las clases de un módulo para descargar su certificado. */
export const CERTIFICATE_MIN_ATTENDANCE_PERCENT = 80;

/** Datos del responsable del tratamiento. Reemplazar los marcadores antes de publicar. */
export const CONTROLLER = {
  legalName: '[RAZÓN SOCIAL DE EMPODERADAS DIVERSAS]',
  taxId: '[EIN / NÚMERO DE REGISTRO]',
  address: '[DIRECCIÓN, MIAMI, FLORIDA, EE. UU.]',
  email: '[CORREO PARA CONSULTAS Y RECLAMOS DE DATOS]',
  phone: '[TELÉFONO]',
} as const;

/**
 * Cambiar a true SOLO cuando los textos de /terminos y /privacidad estén completos (sin marcadores entre corchetes)
 * y revisados por asesoría legal. Mientras sea false: las páginas legales muestran un aviso de borrador y
 * no se exige la pantalla de aceptación. Al activarla, subir también CURRENT_TERMS_VERSION.
 */
export const LEGAL_REVIEW_COMPLETED = false;
