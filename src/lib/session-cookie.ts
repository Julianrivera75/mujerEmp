const isProd = process.env.NODE_ENV === 'production';

/** En producción la cookie usa el prefijo __Host-: solo se acepta con Secure, sin Domain y en toda la ruta. */
export const SESSION_COOKIE = isProd ? '__Host-empoderas_session' : 'empoderas_session';

/** Vista activa (rol con el que se está usando la plataforma) cuando la cuenta tiene más de un rol. */
export const VIEW_COOKIE = isProd ? '__Host-empoderas_view' : 'empoderas_view';
