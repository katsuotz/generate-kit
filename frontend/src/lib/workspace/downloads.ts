import type { PreviewResult } from '$lib/preview/types';

export function fileStem(fullName: string) {
  return (
    fullName
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cv'
  );
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadText(source: string, fullName: string) {
  if (!source) return;
  downloadBlob(new Blob([source], { type: 'application/x-tex' }), `${fileStem(fullName)}-cv.tex`);
}

export function downloadPdf(result: PreviewResult | null, fullName: string) {
  if (!result || result.kind !== 'success' || result.representation !== 'pdf') return;
  downloadBlob(
    new Blob([result.data], { type: 'application/pdf' }),
    `${fileStem(fullName)}-cv.pdf`
  );
}

export function copySource(source: string) {
  if (!source) return Promise.resolve();
  return navigator.clipboard.writeText(source);
}
