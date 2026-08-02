import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard';

describe('clipboard utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the browser clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    await copyToClipboard('source');
    expect(writeText).toHaveBeenCalledWith('source');
  });

  it('falls back to document copy when the browser API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    await copyToClipboard('source');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });
});
