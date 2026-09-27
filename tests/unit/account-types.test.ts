import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPES, accountTypeOf, isStudentAccount } from '@/lib/account-types';
import { generatePassword } from '@/lib/password-generator';

describe('tipos de cuenta', () => {
  it('cada combinación de rol principal y adicionales corresponde a un tipo', () => {
    expect(accountTypeOf('STUDENT', [])).toBe('STUDENT');
    expect(accountTypeOf('MENTOR', [])).toBe('MENTOR');
    expect(accountTypeOf('MENTOR', ['STUDENT'])).toBe('MENTOR_STUDENT');
    expect(accountTypeOf('ADMIN', [])).toBe('ADMIN');
  });

  it('una combinación distinta se marca como personalizada', () => {
    expect(accountTypeOf('ADMIN', ['MENTOR'])).toBe('CUSTOM');
    expect(accountTypeOf('STUDENT', ['MENTOR'])).toBe('CUSTOM');
  });

  it('los tipos no repiten el rol principal entre los adicionales', () => {
    for (const type of ACCOUNT_TYPES) expect(type.extraRoles as readonly string[]).not.toContain(type.role);
  });

  it('solo quien es estudiante (principal o adicional) lleva número de estudiante', () => {
    expect(isStudentAccount('STUDENT', [])).toBe(true);
    expect(isStudentAccount('MENTOR', ['STUDENT'])).toBe(true);
    expect(isStudentAccount('MENTOR', [])).toBe(false);
    expect(isStudentAccount('ADMIN', [])).toBe(false);
  });
});

describe('generatePassword', () => {
  it('genera 9 dígitos que no empiezan en cero y no se repiten entre llamadas', () => {
    const values = new Set(Array.from({ length: 50 }, () => generatePassword()));
    for (const value of values) expect(value).toMatch(/^[1-9]\d{8}$/);
    expect(values.size).toBeGreaterThan(45);
  });
});
