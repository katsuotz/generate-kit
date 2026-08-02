import { describe, expect, it } from 'vitest';
import { normalizeTemplateCatalog } from './serialization';

describe('template catalog serialization', () => {
  it('accepts the wrapped catalog response and ignores entries without ids', () => {
    expect(
      normalizeTemplateCatalog({
        templates: [
          { id: 'editorial-v1', name: 'Editorial dossier', description: 'Quiet' },
          { name: 'Missing id' }
        ]
      })
    ).toEqual([{ id: 'editorial-v1', name: 'Editorial dossier', description: 'Quiet' }]);
  });
});
