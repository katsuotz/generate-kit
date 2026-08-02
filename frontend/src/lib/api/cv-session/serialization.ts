import type { CvData } from '$lib/cv/model';
import type { CvSessionDraft, CvSessionResponse } from './types';

export function serializeCvSession(draft: CvSessionDraft) {
  return {
    schema_version: draft.schemaVersion,
    data: draft.data,
    template_id: draft.templateId,
    generated_template_id: draft.generatedTemplateId,
    generated_source: draft.lastGeneratedSource,
    generated_at: draft.generatedAt,
    fingerprint: draft.fingerprint
  };
}

export function normalizeCvSession(value: unknown) {
  const wrapper = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const session = wrapper.session && typeof wrapper.session === 'object' ? wrapper.session : value;
  const record = (session && typeof session === 'object' ? session : {}) as Record<string, unknown>;
  return {
    id: String(record.id),
    version: Number(record.version ?? record.expected_version ?? 0),
    projectId: String(record.projectId ?? record.project_id ?? ''),
    documentId: String(record.documentId ?? record.document_id ?? ''),
    schemaVersion: Number(record.schemaVersion ?? record.schema_version ?? 1),
    data: record.data as CvData,
    templateId: String(record.templateId ?? record.template_id ?? 'editorial-v1'),
    generatedTemplateId:
      record.generatedTemplateId === undefined && record.generated_template_id === undefined
        ? typeof (record.lastGeneratedSource ?? record.generated_source) === 'string' &&
          String(record.lastGeneratedSource ?? record.generated_source)
          ? String(record.templateId ?? record.template_id ?? 'editorial-v1')
          : null
        : typeof (record.generatedTemplateId ?? record.generated_template_id) === 'string'
          ? String(record.generatedTemplateId ?? record.generated_template_id)
          : null,
    lastGeneratedSource:
      typeof (
        record.lastGeneratedSource ??
        record.generated_source ??
        record.last_generated_source
      ) === 'string'
        ? String(
            record.lastGeneratedSource ?? record.generated_source ?? record.last_generated_source
          )
        : '',
    generatedAt:
      record.generatedAt === undefined
        ? ((record.generated_at as string | null | undefined) ?? null)
        : (record.generatedAt as string | null),
    fingerprint: typeof record.fingerprint === 'string' ? record.fingerprint : ''
  } satisfies CvSessionResponse;
}
