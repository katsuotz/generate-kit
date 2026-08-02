export type SelectOption = { value: string; label: string; disabled?: boolean };

export function toFieldId(value: string, prefix = 'field') {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${prefix}-${normalized || 'input'}`;
}

export function fieldErrorId(fieldId: string) {
  return `${fieldId}-error`;
}

export function describedBy(fieldId: string, hasError: boolean, describedById?: string) {
  return (
    [describedById, hasError ? fieldErrorId(fieldId) : undefined].filter(Boolean).join(' ') ||
    undefined
  );
}
