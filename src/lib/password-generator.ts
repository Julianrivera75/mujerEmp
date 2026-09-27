/** Contraseña numérica de 9 dígitos generada en el navegador con una fuente aleatoria segura. */
export function generatePassword(): string {
  const values = new Uint32Array(9);
  crypto.getRandomValues(values);
  // El primer dígito nunca es 0 para que no se pierda al abrirlo en una hoja de cálculo.
  return Array.from(values, (v, i) => String(i === 0 ? (v % 9) + 1 : v % 10)).join('');
}
