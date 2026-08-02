export async function copyToClipboard(text: string) {
  if (!text) return;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard access is unavailable.');
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand?.('copy') ?? false;
  input.remove();

  if (!copied) throw new Error('Clipboard access is unavailable.');
}

export const copyText = copyToClipboard;
export const copySource = copyToClipboard;
