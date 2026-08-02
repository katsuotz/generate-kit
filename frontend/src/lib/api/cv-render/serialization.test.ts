import { describe, expect, it } from 'vitest';
import { normalizeCvRender, serializeCvRender } from './serialization';

describe('CV render serialization', () => {
  it('serializes the selected template and structured CV data', () => {
    const data = { identity: { fullName: 'Ada' } } as never;
    expect(serializeCvRender({ templateId: 'editorial-v1', data })).toEqual({
      template_id: 'editorial-v1',
      data
    });
  });

  it('normalizes the backend generated source response', () => {
    expect(
      normalizeCvRender({
        template_id: 'compact-v1',
        generated_source: 'source',
        generated_at: '2026-08-02T00:00:00Z'
      })
    ).toEqual({
      templateId: 'compact-v1',
      generatedSource: 'source',
      generatedAt: '2026-08-02T00:00:00Z'
    });
  });
});
