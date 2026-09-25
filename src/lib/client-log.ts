/** Único punto de registro de errores en el navegador (sin datos de la persona usuaria). */
export function logClientError(context: string, error?: unknown) {
  const detail = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
  console.error(context, detail ?? '');
}
