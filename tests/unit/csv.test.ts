import { describe, expect, it } from 'vitest';
import { toCsv } from '@/lib/csv';

describe('toCsv', () => {
  it('antepone el BOM, entrecomilla las celdas y duplica las comillas internas', () => {
    const csv = toCsv(['Nombre', 'Nota'], [['Ana "la mayor"', 'a, b']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.split('\n')[1]).toBe('"Ana ""la mayor""","a, b"');
  });

  it('neutraliza las fórmulas pero conserva números y teléfonos', () => {
    const csv = toCsv(['x'], [['=HYPERLINK("http://x")'], ['+1 305 555 0123'], ['044100526'], [null]]);
    const lines = csv.split('\n');
    expect(lines[1].startsWith('"\'=')).toBe(true);
    expect(lines[2]).toBe('"+1 305 555 0123"');
    expect(lines[3]).toBe('"044100526"');
    expect(lines[4]).toBe('""');
  });
});
