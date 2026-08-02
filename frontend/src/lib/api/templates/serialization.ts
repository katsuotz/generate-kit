import type { CvTemplateSummary } from './types';

export function normalizeTemplateCatalog(value: unknown): CvTemplateSummary[] {
  const rawTemplates = Array.isArray(value)
    ? value
    : value &&
        typeof value === 'object' &&
        Array.isArray((value as { templates?: unknown }).templates)
      ? (value as { templates: unknown[] }).templates
      : [];

  return rawTemplates.flatMap((template) => {
    if (!template || typeof template !== 'object') return [];
    const record = template as Record<string, unknown>;
    const id = String(record.id ?? record.template_id ?? '').trim();
    if (!id) return [];
    return [
      {
        id,
        name: String(record.name ?? record.title ?? id),
        description: String(record.description ?? '')
      }
    ];
  });
}
