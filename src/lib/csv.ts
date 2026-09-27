/** Escapa una celda: siempre entre comillas, y neutraliza las fórmulas de hojas de cálculo (=, +, -, @). */
function cell(value: string | number | null | undefined): string {
  let text = String(value ?? '');
  // Una celda que empieza con estos caracteres podría ejecutarse como fórmula al abrirla en Excel.
  if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Texto CSV con BOM (para que Excel respete las tildes) a partir de un encabezado y filas. */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(','));
  return '﻿' + lines.join('\n');
}

/** Descarga un texto como archivo en el navegador. */
export function downloadTextFile(fileName: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
