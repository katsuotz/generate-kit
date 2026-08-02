import type { PreviewResult } from '$lib/preview/types';
import { copyToClipboard } from '$lib/utils/clipboard';
import { downloadBlob as downloadBlobFile } from '$lib/utils/download';
import { fileStem } from '$lib/utils/filename';

export { fileStem };

export const downloadBlob = downloadBlobFile;

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
  return copyToClipboard(source);
}
