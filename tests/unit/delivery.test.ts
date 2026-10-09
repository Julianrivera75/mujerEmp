import { describe, expect, it } from 'vitest';
import {
  describeDelivery,
  hasDeliveryChoice,
  legacyRequirements,
  submissionFiles,
  submissionLink,
  validateDelivery,
} from '@/lib/delivery';
import { contentTypeOf, isImageName, nameFromKey, opensInBrowser } from '@/lib/file-types';
import { matchesSignature } from '@/lib/s3';

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('firmas de archivo', () => {
  it('reconoce PDF e imágenes', () => {
    expect(matchesSignature('application/pdf', bytes(0x25, 0x50, 0x44, 0x46))).toBe(true);
    expect(matchesSignature('image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(true);
    expect(matchesSignature('image/jpeg', bytes(0xff, 0xd8, 0xff))).toBe(true);
  });

  it('reconoce Word, PowerPoint y Excel (formatos modernos y antiguos)', () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04);
    const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    expect(matchesSignature(DOCX, zip)).toBe(true);
    expect(matchesSignature('application/vnd.openxmlformats-officedocument.presentationml.presentation', zip)).toBe(
      true,
    );
    expect(matchesSignature('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', zip)).toBe(true);
    expect(matchesSignature('application/msword', ole)).toBe(true);
    expect(matchesSignature('application/vnd.ms-powerpoint', ole)).toBe(true);
    expect(matchesSignature('application/vnd.ms-excel', ole)).toBe(true);
  });

  it('rechaza un archivo cuyo contenido no corresponde al tipo declarado', () => {
    expect(matchesSignature(DOCX, bytes(0x25, 0x50, 0x44, 0x46))).toBe(false); // un PDF dicho docx
    expect(matchesSignature('application/msword', bytes(0x50, 0x4b, 0x03, 0x04))).toBe(false);
    expect(matchesSignature('application/pdf', bytes(0x4d, 0x5a))).toBe(false); // un ejecutable
    expect(matchesSignature('application/x-msdownload', bytes(0x4d, 0x5a))).toBe(false);
  });
});

describe('tipos de archivo permitidos', () => {
  it('toma el tipo de la extensión cuando el navegador no lo informa', () => {
    expect(contentTypeOf({ name: 'tarea.docx', type: '' })).toBe(DOCX);
    expect(contentTypeOf({ name: 'FOTO.JPG', type: '' })).toBe('image/jpeg');
    expect(contentTypeOf({ name: 'virus.exe', type: 'application/x-msdownload' })).toBeNull();
    expect(contentTypeOf({ name: 'sin-extension', type: '' })).toBeNull();
  });

  it('distingue lo que se abre en el navegador de lo que se descarga', () => {
    expect(opensInBrowser('a.pdf')).toBe(true);
    expect(opensInBrowser('a.png')).toBe(true);
    expect(opensInBrowser('a.docx')).toBe(false);
    expect(isImageName('a.webp')).toBe(true);
    expect(nameFromKey('entregas/abc/1699999999-informe final.pdf')).toBe('informe final.pdf');
  });
});

describe('reglas de la entrega', () => {
  const cfg = (
    file: 'NONE' | 'OPTIONAL' | 'REQUIRED',
    link: 'NONE' | 'OPTIONAL' | 'REQUIRED',
    text: 'NONE' | 'OPTIONAL' | 'REQUIRED',
    maxFiles = 1,
  ) => ({
    fileRequirement: file,
    linkRequirement: link,
    textRequirement: text,
    maxFiles,
  });

  it('cumple lo obligatorio y acepta lo opcional', () => {
    const c = cfg('REQUIRED', 'OPTIONAL', 'REQUIRED', 2);
    expect(validateDelivery(c, { notes: 'comentario', fileCount: 2, link: 'https://x.co' })).toBeNull();
    expect(validateDelivery(c, { notes: 'comentario', fileCount: 0, link: null })).toContain('archivo');
    expect(validateDelivery(c, { notes: '', fileCount: 1, link: null })).toContain('texto');
    expect(validateDelivery(c, { notes: 'x', fileCount: 3, link: null })).toContain('hasta 2');
  });

  it('con todo opcional basta con uno, y lo que no se pide se rechaza', () => {
    const c = cfg('OPTIONAL', 'OPTIONAL', 'NONE');
    expect(validateDelivery(c, { notes: '', fileCount: 0, link: null })).toContain('No has entregado nada');
    expect(validateDelivery(c, { notes: '', fileCount: 0, link: 'https://x.co' })).toBeNull();
    expect(validateDelivery(c, { notes: 'texto', fileCount: 1, link: null })).toContain('no recibe texto');
  });

  it('si solo se pide texto, pide 20 caracteres', () => {
    const c = cfg('NONE', 'NONE', 'REQUIRED');
    expect(validateDelivery(c, { notes: 'corto', fileCount: 0, link: null })).toContain('mínimo 20');
    expect(validateDelivery(c, { notes: 'a'.repeat(20), fileCount: 0, link: null })).toBeNull();
  });

  it('describe lo que se pide en una frase', () => {
    expect(describeDelivery(cfg('REQUIRED', 'NONE', 'NONE'))).toBe('un archivo');
    expect(describeDelivery(cfg('REQUIRED', 'NONE', 'NONE', 3))).toBe('archivos (hasta 3)');
    expect(describeDelivery(cfg('OPTIONAL', 'OPTIONAL', 'NONE'))).toContain('al menos una de estas opciones');
    expect(describeDelivery(cfg('OPTIONAL', 'OPTIONAL', 'REQUIRED'))).toBe(
      'un texto escrito; también puede agregar un archivo o un enlace (https://...)',
    );
    expect(hasDeliveryChoice(cfg('NONE', 'NONE', 'NONE'))).toBe(false);
  });

  it('traduce la forma antigua', () => {
    expect(legacyRequirements('FILE', true)).toEqual({
      fileRequirement: 'REQUIRED',
      linkRequirement: 'NONE',
      textRequirement: 'REQUIRED',
    });
    expect(legacyRequirements('ANY', false)).toEqual({
      fileRequirement: 'OPTIONAL',
      linkRequirement: 'OPTIONAL',
      textRequirement: 'OPTIONAL',
    });
  });

  it('lee las entregas anteriores (un archivo o un enlace) y las nuevas', () => {
    expect(submissionFiles({ fileUrl: 'entregas/a/12-x.pdf', fileType: 'PDF' })).toEqual([
      { key: 'entregas/a/12-x.pdf', name: 'x.pdf' },
    ]);
    expect(submissionFiles({ fileUrl: 'https://x.co', fileType: 'LINK' })).toEqual([]);
    expect(submissionLink({ fileUrl: 'https://x.co', fileType: 'LINK' })).toBe('https://x.co');
    expect(submissionFiles({ fileKeys: ['k1', 'k2'], fileNames: ['uno.pdf', ''] })).toEqual([
      { key: 'k1', name: 'uno.pdf' },
      { key: 'k2', name: 'k2' },
    ]);
    expect(submissionLink({ linkUrl: 'https://nuevo.co', fileKeys: ['k1'] })).toBe('https://nuevo.co');
  });
});
