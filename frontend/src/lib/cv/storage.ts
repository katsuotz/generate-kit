import type { CvData } from './model';

export const CV_STORAGE_KEY = 'latex-renderer.cv-builder.v1';
export interface CvStorageRecord {
  version: 1;
  data: CvData;
  templateId: string;
  lastGeneratedSource: string;
  generatedAt: string | null;
  fingerprint: string;
}

export const fingerprintCv = (data: CvData) => {
  const input = JSON.stringify(data);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1)
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export function loadCvRecord(
  storage: Pick<Storage, 'getItem'>,
  onFailure?: () => void
): CvStorageRecord | null {
  try {
    const parsed = JSON.parse(storage.getItem(CV_STORAGE_KEY) ?? 'null') as CvStorageRecord | null;
    const record =
      parsed?.version === 1 &&
      isCvData(parsed.data) &&
      typeof parsed.templateId === 'string' &&
      typeof parsed.lastGeneratedSource === 'string' &&
      (parsed.generatedAt === null || typeof parsed.generatedAt === 'string') &&
      typeof parsed.fingerprint === 'string'
        ? parsed
        : null;
    if (parsed !== null && record === null) onFailure?.();
    return record;
  } catch {
    onFailure?.();
    return null;
  }
}
export function saveCvRecord(storage: Pick<Storage, 'setItem'>, record: CvStorageRecord) {
  try {
    storage.setItem(CV_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

const stringFields = (value: unknown, fields: string[]) =>
  typeof value === 'object' &&
  value !== null &&
  fields.every((field) => typeof (value as Record<string, unknown>)[field] === 'string');
const entries = (value: unknown, fields: string[]) =>
  Array.isArray(value) && value.every((entry) => stringFields(entry, ['id', ...fields]));
function isCvData(value: unknown): value is CvData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  if (
    !stringFields(data.identity, ['fullName', 'professionalTitles', 'location', 'email', 'phone'])
  )
    return false;
  const identity = data.identity as Record<string, unknown>;
  return (
    typeof data.summary === 'string' &&
    entries(identity.profiles, ['type', 'label', 'url']) &&
    entries(data.experience, [
      'role',
      'organization',
      'location',
      'start',
      'end',
      'description',
      'highlights',
      'tools'
    ]) &&
    (data.experience as unknown[]).every(
      (entry) => typeof (entry as Record<string, unknown>).current === 'boolean'
    ) &&
    entries(data.achievements, ['title', 'category', 'date', 'description']) &&
    entries(data.skills, ['category', 'skills']) &&
    entries(data.education, ['institution', 'qualification', 'location', 'start', 'end', 'gpa']) &&
    entries(data.certificates, ['name', 'issuer', 'date', 'credentialUrl']) &&
    entries(data.projects, ['name', 'role', 'url', 'dates', 'description', 'highlights', 'tools'])
  );
}
