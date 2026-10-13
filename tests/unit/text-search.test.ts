import { describe, expect, it } from 'vitest';
import { fold, highlightSegments, rankMatches, scoreText } from '@/lib/text-search';

const names = [
  'María Fernanda Rojas',
  'Maura Rojas',
  'Marta Gómez',
  'Ana María Pérez',
  'Daniela Ortiz',
  'Camila Rojas',
  'Valeria Marín',
];
const rank = (query: string) => rankMatches(names, query, (n) => [n]).map((r) => r.item);

describe('fold', () => {
  it('quita tildes y mayúsculas sin cambiar el largo', () => {
    expect(fold('María ÁLVAREZ Ñandú')).toBe('maria alvarez nandu');
    expect(fold('José-Luis')).toBe('jose luis');
    expect(fold('Ana María').length).toBe('Ana María'.length);
  });
});

describe('rankMatches', () => {
  it('no distingue tildes ni mayúsculas', () => {
    expect(rank('maria')).toContain('María Fernanda Rojas');
    expect(rank('MARIA')).toEqual(rank('maría'));
  });

  it('pone primero a quien empieza por lo escrito', () => {
    const result = rank('mar');
    expect(result[0]).toMatch(/^Mar/);
    expect(result[1]).toMatch(/^Mar/);
    expect(result.indexOf('Ana María Pérez')).toBeGreaterThan(result.indexOf('Marta Gómez'));
  });

  it('encuentra por palabras en cualquier orden', () => {
    expect(rank('rojas ma')).toEqual(expect.arrayContaining(['Maura Rojas', 'María Fernanda Rojas']));
    expect(rank('rojas ma')).not.toContain('Marta Gómez');
    expect(rank('perez maria')[0]).toBe('Ana María Pérez');
  });

  it('un nombre exacto o que empieza igual va antes que uno que solo lo contiene', () => {
    expect(rank('maura rojas')[0]).toBe('Maura Rojas');
    expect(rank('rojas')[0]).not.toBe('Valeria Marín');
  });

  it('perdona una letra mal escrita desde cuatro letras', () => {
    expect(rank('mauro')).toContain('Maura Rojas');
    expect(rank('daniella')).toContain('Daniela Ortiz');
    expect(rank('xyz')).toEqual([]);
    expect(scoreText('Ana', 'ane')).toBeNull(); // tres letras: sin tolerancia
  });

  it('sin búsqueda devuelve todo en el mismo orden', () => {
    expect(rank('')).toEqual(names);
    expect(rank('   ')).toEqual(names);
  });

  it('coincidir solo por el correo vale menos que por el nombre', () => {
    const people = [
      { name: 'Zoe Lara', email: 'ana@mail.com' },
      { name: 'Ana Ruiz', email: 'zoe@mail.com' },
    ];
    const result = rankMatches(people, 'ana', (p) => [p.name, p.email]).map((r) => r.item.name);
    expect(result).toEqual(['Ana Ruiz', 'Zoe Lara']);
  });

  it('ordena de forma estable y alfabética cuando empatan', () => {
    const result = rankMatches(['Luisa B', 'Luisa A', 'Luisa'], 'luisa', (n) => [n]).map((r) => r.item);
    expect(result[0]).toBe('Luisa');
    expect(result.slice(1)).toEqual(['Luisa A', 'Luisa B']);
  });
});

describe('highlightSegments', () => {
  it('marca lo escrito aunque lleve tildes', () => {
    expect(highlightSegments('María Rojas', 'mar')).toEqual([
      { text: 'Mar', match: true },
      { text: 'ía Rojas', match: false },
    ]);
    expect(highlightSegments('María Rojas', 'ROJ')).toEqual([
      { text: 'María ', match: false },
      { text: 'Roj', match: true },
      { text: 'as', match: false },
    ]);
  });

  it('sin búsqueda deja el texto entero', () => {
    expect(highlightSegments('Ana', '')).toEqual([{ text: 'Ana', match: false }]);
  });
});
