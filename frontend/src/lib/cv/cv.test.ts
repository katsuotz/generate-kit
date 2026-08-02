import { describe, expect, it } from 'vitest';
import { blankCv, validateCv } from './model';
import { fingerprintCv } from './storage';

describe('CV model utilities', () => {
  it('requires identity and a contact method', () => {
    const data = blankCv();
    expect(validateCv(data).map((error) => error.path)).toEqual([
      'identity.fullName',
      'identity.email'
    ]);
  });

  it('rejects a filled invalid email address', () => {
    const data = blankCv();
    data.identity.fullName = 'Ada';
    data.identity.email = 'not-an-email';
    expect(validateCv(data)).toContainEqual(
      expect.objectContaining({ path: 'identity.email', message: 'Use a valid email address.' })
    );
  });

  it('fingerprints structured data deterministically', () => {
    const data = blankCv();
    expect(fingerprintCv(data)).toBe(fingerprintCv(structuredClone(data)));
  });
});
