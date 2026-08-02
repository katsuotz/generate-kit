import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

describe('download utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a temporary download link and schedules URL cleanup', () => {
    vi.useFakeTimers();
    const url = 'blob:test';
    const createObjectURL = vi.fn().mockReturnValue(url);
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(['source']), 'cv.tex');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="cv.tex"]')).toBeNull();

    vi.advanceTimersByTime(1_000);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
    vi.useRealTimers();
  });
});
