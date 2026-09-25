/** En producción la cookie usa el prefijo __Host-: solo se acepta con Secure, sin Domain y en toda la ruta. */
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-empoderas_session' : 'empoderas_session';
