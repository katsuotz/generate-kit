import { describe, expect, it } from 'vitest';
import { blankCv } from '$lib/cv/model';
import { normalizeCvSession, serializeCvSession } from './serialization';

describe('CV session serialization', () => {
  it('preserves selected and generated template ids', () => {
    const draft = {
      schemaVersion: 1,
      data: blankCv(),
      templateId: 'compact-v1',
      generatedTemplateId: 'editorial-v1',
      lastGeneratedSource: 'source',
      generatedAt: '2026-08-02T00:00:00Z',
      fingerprint: 'fingerprint'
    };

    expect(serializeCvSession(draft)).toMatchObject({
      template_id: 'compact-v1',
      generated_template_id: 'editorial-v1'
    });
    expect(
      normalizeCvSession({ id: 'session-1', version: 1, ...serializeCvSession(draft) })
    ).toMatchObject({
      templateId: 'compact-v1',
      generatedTemplateId: 'editorial-v1',
      lastGeneratedSource: 'source'
    });
  });
});
