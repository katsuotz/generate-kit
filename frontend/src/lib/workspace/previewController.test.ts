import { describe, expect, it } from 'vitest';
import type { PreviewAdapter, PreviewResult } from '$lib/preview/types';
import { PreviewController, type PreviewState } from './previewController';

class DeferredAdapter implements PreviewAdapter {
  requests: Array<{ source: string; resolve: (result: PreviewResult) => void }> = [];

  render(source: string): Promise<PreviewResult> {
    return new Promise((resolve) => this.requests.push({ source, resolve }));
  }
}

describe('PreviewController', () => {
  it('ignores stale responses', async () => {
    const adapter = new DeferredAdapter();
    let latest: PreviewState | undefined;
    const controller = new PreviewController(adapter, (state) => (latest = state));

    const oldRequest = controller.compile('old');
    const newRequest = controller.compile('new');
    adapter.requests[1].resolve({
      kind: 'success',
      representation: 'html',
      source: 'new',
      html: '<p>new</p>'
    });
    await newRequest;
    adapter.requests[0].resolve({
      kind: 'success',
      representation: 'html',
      source: 'old',
      html: '<p>old</p>'
    });
    await oldRequest;

    expect(latest?.lastSuccess?.source).toBe('new');
  });

  it('preserves the last successful preview after a failure', async () => {
    const adapter = new DeferredAdapter();
    let latest: PreviewState | undefined;
    const controller = new PreviewController(adapter, (state) => (latest = state));

    const success = controller.compile('good');
    adapter.requests[0].resolve({
      kind: 'success',
      representation: 'html',
      source: 'good',
      html: '<p>proof</p>'
    });
    await success;
    const failure = controller.compile('bad');
    adapter.requests[1].resolve({
      kind: 'failure',
      diagnostics: [{ severity: 'error', message: 'Bad', line: 1, column: 1, code: 'BAD' }]
    });
    await failure;

    expect(latest?.status).toBe('failure');
    expect(latest?.lastSuccess?.representation).toBe('html');
    if (latest?.lastSuccess?.representation === 'html') {
      expect(latest.lastSuccess.html).toBe('<p>proof</p>');
    }
  });
});
