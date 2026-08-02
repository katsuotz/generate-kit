import type { CvData } from '$lib/cv/model';
import type { CvSessionDraft, CvSessionResponse } from './types';

export function serializeCvSession(draft: CvSessionDraft) {
  return {
    schema_version: draft.schemaVersion,
    data: draft.data,
    template_id: draft.templateId,
    generated_source: draft.lastGeneratedSource,
    generated_at: draft.generatedAt,
    fingerprint: draft.fingerprint
  };
}

export function normalizeCvSession(value: CvSessionResponse | { session?: CvSessionResponse }) {
  const session = 'session' in value && value.session ? value.session : value;
  const record = session as unknown as Record<string, unknown>;
  return {
    id: String(record.id),
    version: Number(record.version ?? record.expected_version ?? 0),
    projectId: String(record.projectId ?? record.project_id ?? ''),
    documentId: String(record.documentId ?? record.document_id ?? ''),
    schemaVersion: Number(record.schemaVersion ?? record.schema_version ?? 1),
    data: record.data as CvData,
    templateId: String(record.templateId ?? record.template_id ?? 'editorial-v1'),
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
