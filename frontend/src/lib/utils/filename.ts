export function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

export const normalizeString = normalizeText;

export function normalizeFilename(value: string | null | undefined, fallback = 'file') {
  const normalized = normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function fileStem(fullName: string | null | undefined) {
  return normalizeFilename(fullName, 'cv');
}

export const slugify = normalizeFilename;
export const safeFilename = normalizeFilename;
