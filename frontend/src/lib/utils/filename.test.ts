import { describe, expect, it } from 'vitest';
import { fileStem, normalizeFilename, normalizeText } from './filename';

describe('filename utilities', () => {
  it('normalizes whitespace and accents into a safe filename stem', () => {
    expect(normalizeText('  Ada   Lovelace  ')).toBe('Ada Lovelace');
    expect(normalizeFilename('  José  García  ')).toBe('jose-garcia');
    expect(fileStem('')).toBe('cv');
  });
});
