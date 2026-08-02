export function downloadBlob(blob: Blob, name: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Downloads are only available in a browser.');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name || 'download';
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadText(source: string, name: string, mimeType = 'text/plain') {
  if (!source) return;
  downloadBlob(new Blob([source], { type: mimeType }), name);
}
