/** Registra un error sin volcar el objeto completo (los errores de base de datos pueden incluir datos personales). */
export function logError(scope: string, error: unknown) {
  const e = error as { name?: string; code?: string; message?: string } | null;
  const firstLine = typeof e?.message === 'string' ? e.message.split('\n')[0].slice(0, 200) : '';
  console.error(`[${scope}]`, e?.name ?? 'Error', e?.code ?? '', firstLine);
}
