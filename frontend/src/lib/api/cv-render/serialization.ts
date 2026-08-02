import type { CvRenderRequest, CvRenderResponse } from './types';

export function serializeCvRender(request: CvRenderRequest) {
  return {
    template_id: request.templateId,
    data: request.data
  };
}

export function normalizeCvRender(value: unknown): CvRenderResponse {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const generatedSource = record.generatedSource ?? record.generated_source ?? record.source;
  const generatedAt = record.generatedAt ?? record.generated_at;
  const templateId = record.templateId ?? record.template_id;

  if (typeof templateId !== 'string' || !templateId.trim())
    throw new Error('The render response did not include a template id.');
  if (typeof generatedSource !== 'string' || !generatedSource)
    throw new Error('The render response did not include generated source.');
  if (typeof generatedAt !== 'string' || !generatedAt)
    throw new Error('The render response did not include a generation timestamp.');

  return {
    templateId,
    generatedSource,
    generatedAt
  };
}
